// app/employee/orders/page.jsx
import OrderList from '@/components/orders/OrderList';
export default function EmployeeOrders() {
  return <OrderList basePath="/employee" />;
}