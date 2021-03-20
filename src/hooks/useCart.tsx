import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Product, Stock } from '../types';

import { ToastContainer, toast } from 'react-toastify';
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
 
  useEffect(() => {
    localStorage.setItem(keyStorage, JSON.stringify(cart));
  }, [cart])
  
  const addProduct = async (productId: number) => {
    try {

      const verifyProduct = 
        cart.find(product => product.id === productId)

      const responseStock = 
          await api.get<Stock>(`/stock/${productId}`)
      
      if (verifyProduct) {

        if (responseStock.data.amount <= verifyProduct.amount) {
          return;
        }
        
        setCart(
          cart.map(product => {
            if (product.id === verifyProduct.id) {
              return { ...product, amount: verifyProduct.amount + 1}
            }
            return product
          })
        )


      } else {
        const responseProduct = 
          await api.get<Product>(`/products/${productId}`)
        
  
        setCart(state =>  
          [...state, { ...responseProduct.data, amount: 1 }]
        )

      }


    } catch {
      toast.error('Aconteceu um problema ao tentar adicionar esse produto')
    }
  };


  const removeProduct = (productId: number) => {
    try {
      
      const verifyByProductExist = cart.find(product => product.id === productId);
      
      if(!verifyByProductExist) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const productsRemove = cart.filter(product => {
        if (product.id !== productId) {
          return product
        }
      })

      setCart(productsRemove);
    } catch {
      toast.error('Erro ao remover produto do carrinho');    
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      
      const verifyExistProduct = cart.find(product => product.id === productId)

      if(!verifyExistProduct) {
        return;
      }

      const { data: stock } = 
        await api.get<Stock>(`/stock/${productId}`);
      
      if (stock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
     
      setCart(
        cart.map(product => {
          if (product.id === productId) {
            return ({ ...product, amount})
          }
          return product
        })
      )
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
