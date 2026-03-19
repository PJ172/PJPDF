import React from 'react';
import { X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PdfTab {
  id: string;
  metadata: {
    title: string;
    page_count: number;
    author: string;
  };
}

interface TabBarProps {
  tabs: PdfTab[];
  activeTabId: string | null;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onSwitch, onClose }) => {
  return (
    <div className="flex bg-noir-black border-b border-white/5 overflow-x-auto scrollbar-hide h-10 items-center px-4 gap-1">
      <AnimatePresence>
        {tabs.map((tab) => {
          const fileName = tab.id.split('\\').pop()?.split('/').pop() || tab.metadata.title || "Unknown Document";
          const isActive = tab.id === activeTabId;
          
          return (
            <motion.div
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={tab.id}
              onClick={() => onSwitch(tab.id)}
              className={`
                flex items-center gap-2 px-4 h-8 min-w-[120px] max-w-[200px] cursor-pointer transition-all relative group
                ${isActive ? 'bg-noir-gray border-t-2 border-t-signal-orange' : 'hover:bg-white/5'}
              `}
            >
              <FileText size={12} className={isActive ? 'text-signal-orange' : 'opacity-40'} />
              <span className={`text-[10px] font-bold truncate ${isActive ? 'text-white' : 'opacity-40 group-hover:opacity-100'}`}>
                {fileName}
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 hover:text-signal-orange transition-opacity p-1"
              >
                <X size={10} />
              </button>
              
              {!isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-white/5" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default TabBar;
