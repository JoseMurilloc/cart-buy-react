import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Product, Stock } from '../types';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

const keyStorage = '@RocketShoes:cart'

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem(keyStorage)
    if (storageCart) {
      return JSON.parse(storageCart);
    }
    
    return [];
  });
 
  function updateLocalStorage(cart: Product[]) {
    localStorage.setItem(keyStorage, JSON.stringify(cart));
  }
  
  const addProduct = async (productId: number) => {
    try {

      const existProduct = 
        cart.find(product => product.id === productId)

      const responseStock = 
          await api.get<Stock>(`/stock/${productId}`)
      
      if (!responseStock.data || responseStock.data.amount === 0 || (existProduct && existProduct.amount >= responseStock.data.amount)) 
      {
        toast.error('Quantidade solicitada fora de estoque');
      } 
        else if (existProduct)
      {
        const newCartProducts = cart.map(product => {
          if (product.id === existProduct.id) {
            return { ...product, amount: existProduct.amount + 1}
          }
          return product
        })
        setCart(newCartProducts)
        updateLocalStorage(newCartProducts)
      } 
        else
      {
        const responseProduct = 
          await api.get<Product>(`/products/${productId}`)
      
        if (!responseProduct) {
          throw new Error('Erro na adição do produto')
        }

        const newProductToCart = [...cart, {...responseProduct.data, amount: 1}]
        
        setCart(newProductToCart)
        updateLocalStorage(newProductToCart)
      }    
    } catch {
      toast.error('Erro na adição do produto');    
    }
  };


  const removeProduct = (productId: number) => {
    try {
      
      const product = cart.find(product => product.id === productId);
      
      if(!product) {
        toast.error('Erro na remoção do produto');
      } else {
        const newCart = cart.filter(product => product.id !== productId)
        setCart(newCart);
        updateLocalStorage(newCart)
  
      }
    
    } catch {
      toast.error('Erro na remoção do produto');    
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      
      if(amount < 1) {
        return;
      }

      const verifyExistProduct = cart.find(product => product.id === productId)

      if(!verifyExistProduct) {
        toast.error('Erro na alteração de quantidade do produto')
        return;
      }

      const { data: stock } = 
        await api.get<Stock>(`/stock/${productId}`);
      
      if (stock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          return ({ ...product, amount})
        }
        return product
      })

      setCart(updatedCart)
      updateLocalStorage(updatedCart)

    } catch {
      toast.error("Limite do estoque atingido!");
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
