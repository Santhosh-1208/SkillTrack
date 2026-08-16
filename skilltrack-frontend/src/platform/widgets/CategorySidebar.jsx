import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Sidebar that lists all simulation categories and allows multi‑select filtering.
 * Props:
 *   categories: array of strings (unique categories present in the simulation list)
 *   onFilterChange: function(selectedCategories) – called whenever selection changes
 */
export default function CategorySidebar({ categories = [], onFilterChange }) {
  const [selected, setSelected] = useState([]);

  const toggle = (cat) => {
    const next = selected.includes(cat)
      ? selected.filter((c) => c !== cat)
      : [...selected, cat];
    setSelected(next);
    onFilterChange && onFilterChange(next);
  };

  return (
    <aside className="glass-card p-4 w-64 h-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Categories</h2>
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat}>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(cat)}
                onChange={() => toggle(cat)}
                className="mr-2"
              />
              <span style={{ color: 'var(--text-primary)' }}>{cat}</span>
            </label>
          </li>
        ))}
      </ul>
    </aside>
  );
}

CategorySidebar.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  onFilterChange: PropTypes.func,
};
