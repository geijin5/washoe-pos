import { Product } from '@/types/pos';

export const defaultProducts: Product[] = [
  // Tickets
  {
    id: '1',
    name: 'Adult Ticket',
    price: 12.50,
    category: 'tickets',
    description: 'General admission',

  },
  {
    id: '2',
    name: 'Child Ticket',
    price: 8.50,
    category: 'tickets',
    description: 'Ages 12 and under',
  },
  {
    id: '3',
    name: 'Senior Ticket',
    price: 10.00,
    category: 'tickets',
    description: 'Ages 65+',
  },
  {
    id: '4',
    name: 'Matinee Ticket',
    price: 9.00,
    category: 'tickets',
    description: 'Before 5pm',
  },
  
  // Concessions
  {
    id: '5',
    name: 'Large Popcorn',
    price: 8.00,
    category: 'concessions',

  },
  {
    id: '6',
    name: 'Medium Popcorn',
    price: 6.50,
    category: 'concessions',
  },
  {
    id: '7',
    name: 'Small Popcorn',
    price: 5.00,
    category: 'concessions',
  },
  {
    id: '8',
    name: 'Nachos',
    price: 7.50,
    category: 'concessions',
  },
  {
    id: '9',
    name: 'Hot Dog',
    price: 6.00,
    category: 'concessions',
  },
  {
    id: '10',
    name: 'Candy Mix',
    price: 4.50,
    category: 'concessions',
    description: 'Assorted candy selection',
  },
  {
    id: '11',
    name: 'Pretzel',
    price: 5.50,
    category: 'concessions',
  },
  
  // Beverages
  {
    id: '12',
    name: 'Large Soda',
    price: 6.00,
    category: 'beverages',

  },
  {
    id: '13',
    name: 'Medium Soda',
    price: 5.00,
    category: 'beverages',
  },
  {
    id: '14',
    name: 'Small Soda',
    price: 4.00,
    category: 'beverages',
  },
  {
    id: '15',
    name: 'Bottled Water',
    price: 3.50,
    category: 'beverages',
  },
  {
    id: '16',
    name: 'Coffee',
    price: 3.00,
    category: 'beverages',
  },
  {
    id: '17',
    name: 'Iced Tea',
    price: 4.00,
    category: 'beverages',
  },
  {
    id: '21',
    name: 'Pop (Coke)',
    price: 4.50,
    category: 'beverages',
    description: 'Coca-Cola',
  },
  {
    id: '22',
    name: 'Pop (Pepsi)',
    price: 4.50,
    category: 'beverages',
    description: 'Pepsi Cola',
  },
  
  // Merchandise
  {
    id: '18',
    name: 'Theatre T-Shirt',
    price: 25.00,
    category: 'merchandise',
  },
  {
    id: '19',
    name: 'Theatre Mug',
    price: 15.00,
    category: 'merchandise',
  },
  {
    id: '20',
    name: 'Program Book',
    price: 10.00,
    category: 'merchandise',
  },
  {
    id: '23',
    name: 'Theatre Keychain',
    price: 5.00,
    category: 'merchandise',
    description: 'Misc souvenir item',
  },
  {
    id: '24',
    name: 'Theatre Magnet',
    price: 3.00,
    category: 'merchandise',
    description: 'Misc souvenir item',
  },
];