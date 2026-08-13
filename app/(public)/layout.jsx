// app/(public)/layout.jsx
'use client';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useUser } from "@clerk/nextjs";
import { fetchCartThunk, uploadCartThunk } from "@/lib/features/cart/cartSlice";
import { useSelector } from "react-redux";

export default function PublicLayout({ children }) {
  const dispatch = useDispatch();
  const { user } = useUser();
  const { items } = useSelector((state) => state.cart);
  const isFirstLoad = useRef(true);
  const prevUserRef = useRef(null);

  // Fetch DB cart when a member signs in
  useEffect(() => {
    if (user && prevUserRef.current !== user.id) {
      prevUserRef.current = user.id;
      dispatch(fetchCartThunk());
    }
  }, [user]);

  // Sync cart to DB when items change — skip the very first render
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (user) {
      dispatch(uploadCartThunk());
    }
  }, [items]);

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}