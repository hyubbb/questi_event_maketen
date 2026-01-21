import React from 'react';
import { CardItem } from '../types';

interface Props {
  card: CardItem;
  onClick: (card: CardItem) => void;
  disabled?: boolean;
}

const NumberCard: React.FC<Props> = ({ card, onClick, disabled }) => {
  return (
    <button
      onClick={() => !disabled && onClick(card)}
      disabled={card.isUsed || disabled}
      className={`
        relative w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-32 
        rounded-xl flex items-center justify-center text-3xl font-bold transition-all duration-200
        ${card.isUsed 
          ? 'bg-gray-200 text-gray-400 border-2 border-dashed border-gray-300 shadow-inner' 
          : 'bg-white text-indigo-600 border-2 border-indigo-100 card-shadow btn-press hover:-translate-y-1 hover:border-indigo-300'
        }
        ${disabled && !card.isUsed ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {card.value}
      {!card.isUsed && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-200 rounded-full"></div>
      )}
    </button>
  );
};

export default NumberCard;