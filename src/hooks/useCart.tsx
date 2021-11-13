import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<Stock>(`stock/${productId}`)
      const stock = stockResponse.data
      if (stock.amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
      }

      const productInCart = cart.find(product => product.id === productId)
      if (productInCart) {
        await updateProductAmount({ productId, amount: productInCart.amount + 1 });
      } else {
        const productResponse = await api.get<Product>(`products/${productId}`)
        const product = productResponse.data
        const newCart = [
          ...cart,
          {
            ...product,
            amount: 1
          }
        ]
        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.findIndex(product => product.id === productId) === -1) {
        throw new Error();
      }
      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockResponse = await api.get<Stock>(`stock/${productId}`)
      const stock = stockResponse.data

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount
          };
        }
        return product;
      });
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
