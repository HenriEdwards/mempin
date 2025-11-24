import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from '../ui/Modal.jsx';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import MemoryDetailsContent from './MemoryDetailsContent.jsx';

function MemoryDetailsModal({ memory, onClose, loading = false, onViewProfile }) {
  const [qrValue, setQrValue] = useState(null);

  useEffect(() => {
    if (!memory) {
      setQrValue(null);
    }
  }, [memory]);

  const handleGenerateQR = (value) => {
    setQrValue(value);
  };

  if (!memory && !loading) {
    return null;
  }

  const isOpen = Boolean(memory) || loading;

  return (
    <>
      <SlidingPanel
        isOpen={isOpen}
        onClose={onClose}
        title="Memory"
        side="left"
        width="520px"
        showCloseButton
      >
        {loading ? (
          <p>Loading memory...</p>
        ) : (
          <MemoryDetailsContent
            memory={memory}
            onGenerateQR={handleGenerateQR}
            onViewProfile={onViewProfile}
          />
        )}
      </SlidingPanel>
      <Modal isOpen={Boolean(qrValue)} onClose={() => setQrValue(null)}>
        <div className="qr-modal">
          <h4>Scan to unlock</h4>
          {qrValue && <QRCodeCanvas value={qrValue} size={220} />}
          <p>{qrValue}</p>
        </div>
      </Modal>
    </>
  );
}

export default MemoryDetailsModal;
