'use client';

import { Product } from '@/lib/db/idb';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;

  return (
    <motion.button
      whileTap={!isOutOfStock ? { scale: 0.95 } : {}}
      disabled={isOutOfStock}
      onClick={() => onAdd(product)}
      className={`group relative bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all text-left flex flex-col h-full ${
        isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'active:bg-orange-50'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-lg">
            {product.category}
          </span>
          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
            product.stock > 10 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {product.stock} IN STOCK
          </span>
        </div>
        
        <h4 className="font-bold text-gray-900 line-clamp-2 text-lg leading-tight mb-1">
          {product.name}
        </h4>
        
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-xs font-bold text-gray-400">₱</span>
          <span className="text-2xl font-black text-gray-900 tracking-tight">
            {product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="w-full bg-gray-900 text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm group-hover:bg-orange-600 transition-colors">
          <Plus className="w-4 h-4" />
          ADD TO CART
        </div>
      </div>
    </motion.button>
  );
}
