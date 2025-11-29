// Products data
const products = [
    {
        id: 1,
        brand: "ADIDAS",
        name: "New Balance MR530 MEN'S RUNNING SHOES",
        price: 120,
        gender: "Men",
        category: "Running",
        image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=ADIDAS+530"
    },
    {
        id: 2,
        brand: "NIKE",
        name: "NIKE DUNK LOW RETRO MEN'S",
        price: 110,
        gender: "Men",
        category: "Lifestyle",
        image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=NIKE+DUNK"
    },
    {
        id: 3,
        brand: "PUMA",
        name: "SPEEDCAT OG UNISEX",
        price: 90,
        gender: "Unisex",
        category: "Racing",
        image: "https://via.placeholder.com/300x200/45B7D1/FFFFFF?text=PUMA+SPEEDCAT"
    },
    {
        id: 4,
        brand: "NIKE",
        name: "AIR FORCE 1 WOMEN'S",
        price: 100,
        gender: "Women",
        category: "Lifestyle",
        image: "https://via.placeholder.com/300x200/96CEB4/FFFFFF?text=NIKE+AF1"
    },
    {
        id: 5,
        brand: "ADIDAS",
        name: "SUPERSTAR UNISEX",
        price: 80,
        gender: "Unisex",
        category: "Lifestyle",
        image: "https://via.placeholder.com/300x200/FECA57/FFFFFF?text=ADIDAS+SUPERSTAR"
    },
    {
        id: 6,
        brand: "NIKE",
        name: "AIR MAX 270 MEN'S",
        price: 150,
        gender: "Men",
        category: "Running",
        image: "https://via.placeholder.com/300x200/FF9FF3/FFFFFF?text=NIKE+AIRMAX"
    },
    {
        id: 7,
        brand: "ADIDAS",
        name: "ULTRA BOOST 4.0 RUNNING SHOES",
        price: 180,
        gender: "Men",
        category: "Running",
        image: "https://via.placeholder.com/300x200/54A0FF/FFFFFF?text=ADIDAS+ULTRA"
    },
    {
        id: 8,
        brand: "NIKE",
        name: "JORDAN 1 RETRO HIGH",
        price: 170,
        gender: "Unisex",
        category: "Basketball",
        image: "https://via.placeholder.com/300x200/5F27CD/FFFFFF?text=NIKE+JORDAN"
    }
];

// Filter state
let currentFilters = {
    gender: [],
    brand: []
};

// Sort state
let currentSort = 'relevance';