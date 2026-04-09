import React from 'react';
import './Step2Selection.css';

const Step2Selection = ({ htmlContent }) => {
    return (
        <div className="preview-container" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div className="html-content" style={{ flexShrink: 0 }}>
                {htmlContent}
            </div>
            {/* Other components can be added here if necessary */}
        </div>
    );
};

export default Step2Selection;
