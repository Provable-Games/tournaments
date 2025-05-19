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
  <div
    style={{
      display: "flex",
      alignItems: "center",
      border: "1px solid #eee",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "16px",
      background: "#fafbfc",
    }}
  >
    <img
      src={icon}
      alt={name}
      style={{ width: 48, height: 48, marginRight: 24, borderRadius: 8 }}
    />
    <div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 20, fontWeight: 600 }}
      >
        {name}
      </a>
      <div style={{ color: "#666", margin: "4px 0" }}>{description}</div>
      <div style={{ fontSize: 14, color: "#888" }}>By {developer}</div>
    </div>
  </div>
);
