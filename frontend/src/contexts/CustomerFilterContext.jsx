import React, { createContext, useContext, useState, useEffect } from 'react';

const CustomerFilterContext = createContext();

export const CustomerFilterProvider = ({ children }) => {
  const [selectedCustomer, setSelectedCustomer] = useState('all'); // 'all' or customer email
  const [customers, setCustomers] = useState([]);

  return (
    <CustomerFilterContext.Provider value={{ 
      selectedCustomer, 
      setSelectedCustomer,
      customers,
      setCustomers 
    }}>
      {children}
    </CustomerFilterContext.Provider>
  );
};

export const useCustomerFilter = () => {
  const context = useContext(CustomerFilterContext);
  if (!context) {
    throw new Error('useCustomerFilter must be used within CustomerFilterProvider');
  }
  return context;
};
