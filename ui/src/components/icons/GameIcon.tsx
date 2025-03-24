interface GameIconProps {
  image: string;
  size?: number;
}

const GameIcon = ({ image, size = 6 }: GameIconProps) => {
  return image ? (
    <img src={image} style={{ height: `${size * 4}px`, width: "auto" }} />
  ) : null;
};

export default GameIcon;
