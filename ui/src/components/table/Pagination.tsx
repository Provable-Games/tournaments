import { Button } from "@/components/ui/button";
import { WEDGE_LEFT, WEDGE_RIGHT } from "@/components/Icons";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  nextPage: () => void;
  previousPage: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
}

const Pagination = ({
  currentPage,
  totalPages,
  nextPage,
  previousPage,
  hasNextPage,
  hasPreviousPage,
  goToPage,
}: PaginationProps) => {
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
          variant={currentPage + 1 === page ? "default" : "outline"}
          onClick={() => goToPage(page as number)}
          className="justify-center shrink-0"
        >
          {page}
        </Button>
      );
    });
  };

  // // Add a useEffect to handle window resize
  // useEffect(() => {
  //   const handleResize = () => {
  //     // Force re-render when window is resized
  //     setCurrentPage(currentPage);
  //   };

  //   window.addEventListener("resize", handleResize);
  //   return () => window.removeEventListener("resize", handleResize);
  // }, [currentPage, setCurrentPage]);

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
        onClick={() => previousPage()}
        disabled={!hasPreviousPage}
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
        onClick={() => nextPage()}
        disabled={!hasNextPage}
        className="shrink-0"
      >
        <WEDGE_RIGHT />
      </Button>
    </div>
  );
};

export default Pagination;
