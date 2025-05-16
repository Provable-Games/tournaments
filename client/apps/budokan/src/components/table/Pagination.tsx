import { Button } from "@/components/ui/button";
import { WEDGE_LEFT, WEDGE_RIGHT } from "@/components/Icons";
import { useEffect } from "react";

interface PaginationProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}

const Pagination = ({
  currentPage,
  setCurrentPage,
  totalPages,
}: PaginationProps) => {
  const handleClick = (page: number) => {
    setCurrentPage(page);
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];

    // Get screen width using window.innerWidth
    const isSmallScreen = window.innerWidth < 1280; // lg breakpoint
    const maxVisiblePages = isSmallScreen ? 3 : 6;

    if (totalPages <= maxVisiblePages) {
      // If fewer pages than max, show all without padding
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Adjust visible pages based on screen size
      if (currentPage <= 2) {
        // Near start
        pages.push(1, 2, "...", totalPages);
      } else if (currentPage >= totalPages - 1) {
        // Near end
        pages.push(1, "...", totalPages - 1, totalPages);
      } else {
        // Middle
        pages.push(1, "...", currentPage, "...", totalPages);
      }
    }

    return pages.map((page, index) => {
      if (page === "...") {
        return (
          <span
            key={`ellipsis-${index}`}
            className="sm:px-1 text-brand shrink-0"
          >
            {page}
          </span>
        );
      }

      return (
        <Button
          key={`page-${page}`}
          size={"xs"}
          variant={currentPage === page ? "default" : "outline"}
          onClick={() => handleClick(page as number)}
          className="justify-center shrink-0"
        >
          {page}
        </Button>
      );
    });
  };

  // Add a useEffect to handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Force re-render when window is resized
      setCurrentPage(currentPage);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentPage, setCurrentPage]);

  return (
    <div
      className={`
      flex flex-row gap-1 justify-center items-center
      ${totalPages <= 3 ? "w-fit" : "w-[150px] lg:w-[200px] 3xl:w-[250px]"}
    `}
    >
      <Button
        size={"xs"}
        variant={"outline"}
        onClick={() => currentPage > 1 && handleClick(currentPage - 1)}
        disabled={currentPage === 1}
        className="shrink-0"
      >
        <WEDGE_LEFT />
      </Button>

      <div className="flex flex-row gap-1 justify-center items-center">
        {renderPageNumbers()}
      </div>

      <Button
        size={"xs"}
        variant={"outline"}
        onClick={() => currentPage < totalPages && handleClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="shrink-0"
      >
        <WEDGE_RIGHT />
      </Button>
    </div>
  );
};

export default Pagination;
