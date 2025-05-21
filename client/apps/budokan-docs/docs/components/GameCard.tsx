import React from "react";

export interface GameCardProps {
  icon: string; // URL or import for the icon image
  name: string;
  url: string;
  description: string;
  developer: string;
}

export const GameCard: React.FC<GameCardProps> = ({
  icon,
  name,
  url,
  description,
  developer,
}) => (
  <div className="flex items-center border border-gray-200 rounded-lg p-4 mb-4 bg-gray-900">
    <img src={icon} alt={name} className="w-12 h-12 mr-6 rounded-lg" />
    <div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-semibold hover:underline"
      >
        {name}
      </a>
      <div className="text-gray-200 my-1">{description}</div>
      <div className="text-sm text-gray-300">By {developer}</div>
    </div>
  </div>
);
