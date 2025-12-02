function PanelShell({ leftSlot, centerSlot, rightSlot }) {
  const renderRail = (slot, side) => {
    const hasContent = slot?.isActive ?? Boolean(slot?.content);
    const emptyLabel = slot?.emptyLabel || 'Panel';

    return (
      <div className={`panel-shell__column panel-shell__column--${side}`}>
        <div className={`panel-rail ${hasContent ? 'panel-rail--active' : 'panel-rail--empty'}`}>
          <div className="panel-rail__inner">
            {hasContent ? slot?.content : <div className="panel-rail__empty empty-state">{emptyLabel}</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="panel-shell">
      {renderRail(leftSlot, 'left')}
      <div className="panel-shell__column panel-shell__column--center">
        <div className="panel-center">{centerSlot}</div>
      </div>
      {renderRail(rightSlot, 'right')}
    </div>
  );
}

export default PanelShell;
