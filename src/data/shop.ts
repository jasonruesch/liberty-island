// Shop catalogs based on the real Liberty Island concessions (Evelyn Hill Inc.):
// Crown Café menu items/prices from thestatueofliberty.com, gift items from the
// Gift Pavilion's real stock (foam crowns, replicas, snow globes…). A few
// prices marked in research as estimates are rounded to tourist-typical values.

import type { ItemDef } from '../core/state'

export const CAFE_MENU: ItemDef[] = [
  { id: 'beast-burger', name: 'Beast Burger', price: 16.3, kind: 'food', emoji: '🍔', bites: 5, desc: 'Double Angus, onion rings, bacon, cheddar & garlic mayo.' },
  { id: 'cheeseburger', name: 'All-American Cheeseburger', price: 11.48, kind: 'food', emoji: '🍔', bites: 4, desc: 'The classic, with crisp veggies.' },
  { id: 'hotdog', name: 'New York Hot Dog', price: 6.43, kind: 'food', emoji: '🌭', bites: 3, desc: 'Snappy frank, soft bun. A harbor tradition.' },
  { id: 'pizza', name: 'Pepperoni Pizza', price: 14.24, kind: 'food', emoji: '🍕', bites: 4, desc: 'Fresh from the café oven.' },
  { id: 'tenders', name: "Tenders n' Fries", price: 12.86, kind: 'food', emoji: '🍗', bites: 4, desc: 'Crispy tenders over golden fries.' },
  { id: 'fishchips', name: "Fish n' Chips", price: 13.78, kind: 'food', emoji: '🐟', bites: 4, desc: 'Beer-battered, harbor-appropriate.' },
  { id: 'empanadas', name: 'Beef Empanadas (2)', price: 14.0, kind: 'food', emoji: '🥟', bites: 4, desc: 'By Nuchas® — Argentine style.' },
  { id: 'panini', name: 'Fresh Mozzarella Panini', price: 12.86, kind: 'food', emoji: '🥪', bites: 4, desc: 'Pressed with tomato & basil.' },
  { id: 'chowder', name: 'New England Clam Chowder', price: 8.95, kind: 'food', emoji: '🥣', bites: 3, desc: 'Creamy cup, oyster crackers on top.' },
  { id: 'fries', name: 'French Fries', price: 5.97, kind: 'food', emoji: '🍟', bites: 3, desc: 'Golden & salty — gulls LOVE these.' },
  { id: 'onionrings', name: 'Crispy Onion Rings', price: 6.43, kind: 'food', emoji: '🧅', bites: 3, desc: 'Stacked crunchy rings.' },
  { id: 'fruitcup', name: 'Fruit Cup', price: 7.58, kind: 'food', emoji: '🍓', bites: 3, desc: 'Fresh and bright.' },
  { id: 'cookie', name: 'Chocolate Chip Cookie', price: 3.9, kind: 'food', emoji: '🍪', bites: 2, desc: 'Baked soft, pocket-sized.' },
  { id: 'icecream', name: 'Ice Cream Bar', price: 5.74, kind: 'food', emoji: '🍦', bites: 3, desc: 'Chocolate-dipped vanilla.' },
  { id: 'latte', name: 'Caffè Latte', price: 5.97, kind: 'drink', emoji: '☕', bites: 3, desc: 'From the espresso bar.' },
  { id: 'hotchoc', name: 'Hot Chocolate', price: 4.13, kind: 'drink', emoji: '🍫', bites: 3, desc: 'Warm on a cloudy day.' },
  { id: 'smoothie', name: 'Real Fruit Smoothie', price: 8.27, kind: 'drink', emoji: '🥤', bites: 3, desc: 'Blended berries.' },
  { id: 'water', name: 'Bottled Water', price: 2.76, kind: 'drink', emoji: '💧', bites: 3, desc: 'Stay hydrated, traveler.' },
]

export const KIOSK_MENU: ItemDef[] = [
  { id: 'icecream', name: 'Ice Cream Bar', price: 5.74, kind: 'food', emoji: '🍦', bites: 3, desc: 'Chocolate-dipped vanilla.' },
  { id: 'pretzel', name: 'Soft Pretzel', price: 6.5, kind: 'food', emoji: '🥨', bites: 3, desc: 'Warm, salted, very stealable.' },
  { id: 'chips', name: 'Kettle Chips', price: 3.9, kind: 'food', emoji: '🥔', bites: 2, desc: 'Crunchy grab-and-go.' },
  { id: 'soda', name: 'Fountain Soda', price: 2.76, kind: 'drink', emoji: '🥤', bites: 3, desc: 'Ice cold.' },
  { id: 'water', name: 'Bottled Water', price: 2.76, kind: 'drink', emoji: '💧', bites: 3, desc: 'Stay hydrated, traveler.' },
]

export const GIFT_CATALOG: ItemDef[] = [
  { id: 'foamcrown', name: 'Foam Liberty Crown', price: 9.99, kind: 'souvenir', emoji: '👑', wearable: true, desc: 'THE classic. Sea-green foam, seven rays. Wear it proud.' },
  { id: 'mini-statue', name: 'Mini Statue Replica 6"', price: 14.99, kind: 'souvenir', emoji: '🗽', desc: 'Patina-green Lady Liberty for your shelf.' },
  { id: 'statue-12', name: 'Statue Replica 12"', price: 29.99, kind: 'souvenir', emoji: '🗽', desc: 'The detailed one — torch, tablet and all.' },
  { id: 'torch-replica', name: 'Torch Replica', price: 24.99, kind: 'souvenir', emoji: '🔥', desc: 'Gold flame, copper handle. Hold it high!' },
  { id: 'tshirt', name: 'Liberty Tee', price: 24.99, kind: 'souvenir', emoji: '👕', desc: '"NEW YORK" across the chest. Made in USA section!' },
  { id: 'cap', name: 'NY Harbor Cap', price: 19.99, kind: 'souvenir', emoji: '🧢', wearable: true, desc: 'Navy with an embroidered statue.' },
  { id: 'snowglobe', name: 'Liberty Snow Globe', price: 19.99, kind: 'souvenir', emoji: '🌨️', desc: 'Shake it — it snows on the harbor.' },
  { id: 'magnet', name: 'Fridge Magnet', price: 7.99, kind: 'souvenir', emoji: '🧲', desc: 'For the world map on your fridge.' },
  { id: 'postcards', name: 'Postcard Set', price: 4.99, kind: 'souvenir', emoji: '💌', desc: 'Six harbor views to mail home.' },
  { id: 'keychain', name: 'Torch Keychain', price: 6.99, kind: 'souvenir', emoji: '🔑', desc: 'Tiny torch, big memories.' },
  { id: 'plush', name: 'Plush Liberty Bear', price: 16.99, kind: 'souvenir', emoji: '🧸', desc: 'A bear in a foam crown. Irresistible.' },
  { id: 'ornament', name: 'Holiday Ornament', price: 15.99, kind: 'souvenir', emoji: '🎄', desc: 'Liberty for the tree, any season.' },
]

export const BOOKSTORE_CATALOG: ItemDef[] = [
  { id: 'guidebook', name: 'Official Park Guidebook', price: 12.99, kind: 'souvenir', emoji: '📖', desc: 'Eastern National park store classic.' },
  { id: 'history-book', name: '“Liberty Enlightening the World”', price: 18.99, kind: 'souvenir', emoji: '📚', desc: 'The full story, Bartholdi to today.' },
  { id: 'junior-ranger', name: 'Junior Ranger Kit', price: 8.99, kind: 'souvenir', emoji: '🎖️', desc: 'Badge-earning activity book.' },
  { id: 'poster', name: 'WPA-Style Poster', price: 14.99, kind: 'souvenir', emoji: '🖼️', desc: 'Vintage national-park art print.' },
]
