export interface Coffee {
  id: string;
  index: string;
  name: string;
  volume: string;
  notes: string;
  roast?: string;
  use?: string;
  price: number;
}

export const coffees: Coffee[] = [
  {
    id: "ethiopia-yirgacheffe",
    index: "01",
    name: "Эфиопия Иргачеффе",
    volume: "250 г",
    notes: "цветочный, бергамот",
    roast: "светлая обжарка",
    price: 32,
  },
  {
    id: "colombia-huila",
    index: "02",
    name: "Колумбия Уила",
    volume: "250 г",
    notes: "карамель, красное яблоко",
    price: 29,
  },
  {
    id: "brazil-cerrado",
    index: "03",
    name: "Бразилия Серрадо",
    volume: "250 г",
    notes: "орех, шоколад",
    use: "для эспрессо",
    price: 26,
  },
  {
    id: "drip-bags",
    index: "04",
    name: "Дрип-пакеты",
    volume: "10 шт.",
    notes: "ассорти",
    price: 18,
  },
];

export const workshop = {
  city: "Минск",
  address: "ул. Короля, 9",
  since: 2019,
  batchKg: 5,
  roastDay: "четверг",
  deliveryDay: "пятница",
  pickup: {
    weekdays: "пн–пт 8:00–20:00",
    weekend: "сб–вс 10:00–18:00",
  },
  freeDeliveryFrom: 50,
};

export const subscription = {
  packs: 2,
  packVolume: "250 г",
  pricePerMonth: 54,
  currency: "BYN",
};
