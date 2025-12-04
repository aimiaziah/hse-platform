import React from 'react';

interface CardProps {
  title: string;
  description?: string;
  date?: string;
  tags?: string[];
  onClick?: () => void;
  completed?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  description,
  date,
  tags,
  onClick,
  completed = false,
}) => {
  return (
    <article
      className={`
        bg-bits-white border border-gray-200 rounded-lg p-6 mb-4
        hover:shadow-md transition-shadow cursor-pointer
        ${completed ? 'opacity-75' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-xl font-bold text-bits-dark flex-1">{title}</h2>
        {completed && <span className="text-green-500 text-2xl ml-2">✓</span>}
      </div>

      {description && <p className="text-bits-gray mb-3 line-clamp-2">{description}</p>}

      <div className="flex justify-between items-center">
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-bits-light-gray text-xs rounded text-bits-gray"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {date && <time className="text-sm text-bits-gray">{date}</time>}
      </div>
    </article>
  );
};

export default Card;
