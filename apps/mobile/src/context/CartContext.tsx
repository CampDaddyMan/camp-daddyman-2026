import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  productId: string;
  variantId?: string;
  variantName?: string;
  options?: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue>({} as CartContextValue);

function key(productId: string, variantId?: string) {
  return `${productId}::${variantId ?? ''}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('cart')
      .then((raw) => { if (raw) setItems(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  function persist(next: CartItem[]) {
    setItems(next);
    AsyncStorage.setItem('cart', JSON.stringify(next)).catch(() => {});
  }

  function addItem(incoming: Omit<CartItem, 'quantity'> & { quantity?: number }) {
    const qty = incoming.quantity ?? 1;
    const k = key(incoming.productId, incoming.variantId);
    setItems((prev) => {
      const existing = prev.find((i) => key(i.productId, i.variantId) === k);
      const next = existing
        ? prev.map((i) => key(i.productId, i.variantId) === k ? { ...i, quantity: i.quantity + qty } : i)
        : [...prev, { ...incoming, quantity: qty }];
      AsyncStorage.setItem('cart', JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  function removeItem(productId: string, variantId?: string) {
    const k = key(productId, variantId);
    persist(items.filter((i) => key(i.productId, i.variantId) !== k));
  }

  function updateQuantity(productId: string, variantId: string | undefined, qty: number) {
    if (qty <= 0) { removeItem(productId, variantId); return; }
    const k = key(productId, variantId);
    persist(items.map((i) => key(i.productId, i.variantId) === k ? { ...i, quantity: qty } : i));
  }

  function clearCart() { persist([]); }

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
