import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type UIEvent } from "react";
import { motion, useInView } from "motion/react";
import "./AnimatedList.css";

interface AnimatedItemProps {
  children: ReactNode;
  index: number;
  selected: boolean;
  onMouseEnter: (index: number) => void;
  onClick: (index: number) => void;
}

function AnimatedItem({ children, index, selected, onMouseEnter, onClick }: AnimatedItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35, once: false });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      className="animated-list-item-wrap"
      onMouseEnter={() => onMouseEnter(index)}
      onClick={() => onClick(index)}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className={`animated-list-item ${selected ? "selected" : ""}`}>{children}</div>
    </motion.div>
  );
}

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, selected: boolean) => ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
}

export default function AnimatedList<T>({
  items,
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
}: AnimatedListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);

  const handleItemSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      if (onItemSelect) {
        onItemSelect(items[index], index);
      }
    },
    [items, onItemSelect]
  );

  const updateGradients = useCallback((target: HTMLDivElement) => {
    const { scrollTop, scrollHeight, clientHeight } = target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
  }, []);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      updateGradients(e.currentTarget);
    },
    [updateGradients]
  );

  const scrollSelectedIntoView = useCallback((index: number) => {
    if (!listRef.current || index < 0) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(`[data-index="${index}"]`) as HTMLElement | null;
    if (!selectedItem) return;

    const margin = 48;
    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const itemTop = selectedItem.offsetTop;
    const itemBottom = itemTop + selectedItem.offsetHeight;

    if (itemTop < containerTop + margin) {
      container.scrollTo({ top: itemTop - margin, behavior: "smooth" });
    } else if (itemBottom > containerTop + containerHeight - margin) {
      container.scrollTo({ top: itemBottom - containerHeight + margin, behavior: "smooth" });
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!enableArrowNavigation || items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(selectedIndex + 1, items.length - 1);
        setSelectedIndex(next);
        scrollSelectedIntoView(next);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(selectedIndex - 1, 0);
        setSelectedIndex(next);
        scrollSelectedIntoView(next);
        return;
      }

      if (e.key === "Enter" && selectedIndex >= 0 && selectedIndex < items.length) {
        e.preventDefault();
        handleItemSelect(selectedIndex);
      }
    },
    [enableArrowNavigation, handleItemSelect, items.length, scrollSelectedIntoView, selectedIndex]
  );

  useEffect(() => {
    if (!listRef.current) return;
    updateGradients(listRef.current);
  }, [items, updateGradients]);

  return (
    <div className={`animated-list-container ${className}`}>
      <div
        ref={listRef}
        className={`animated-list-scroll ${!displayScrollbar ? "no-scrollbar" : ""}`}
        onScroll={handleScroll}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={index}
            index={index}
            selected={selectedIndex === index}
            onMouseEnter={setSelectedIndex}
            onClick={handleItemSelect}
          >
            {renderItem(item, index, selectedIndex === index)}
          </AnimatedItem>
        ))}
      </div>

      {showGradients && (
        <>
          <div className="animated-list-gradient top" style={{ opacity: topGradientOpacity }} />
          <div className="animated-list-gradient bottom" style={{ opacity: bottomGradientOpacity }} />
        </>
      )}
    </div>
  );
}
