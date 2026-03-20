import './BottomTabBar.css';

function BottomTabBar({ tabs, activeTab, onTabChange, onMoreClick, moreActive }) {
  return (
    <nav className="btb">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`btb-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="btb-icon">{tab.icon}</span>
          <span className="btb-label">{tab.label}</span>
        </button>
      ))}
      <button
        className={`btb-tab ${moreActive ? 'active' : ''}`}
        onClick={onMoreClick}
      >
        <span className="btb-icon">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="btb-label">More</span>
      </button>
    </nav>
  );
}

export default BottomTabBar;
