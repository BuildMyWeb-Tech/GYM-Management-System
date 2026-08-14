'use client';
import { use } from 'react';
import OrderDetail from '@/components/orders/OrderDetail';
export default function EmployeeOrderDetail({ params }) {
  const { id } = use(params);
  return <OrderDetail basePath="/employee" orderId={id} />;
}
