'use client';
import { use } from 'react';
import OrderDetail from '@/components/orders/OrderDetail';
export default function StoreOrderDetail({ params }) {
  const { id } = use(params);
  return <OrderDetail basePath="/store" orderId={id} />;
}
