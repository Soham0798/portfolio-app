import React, { InputHTMLAttributes, forwardRef, useState, useEffect } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: number | string;
    onChange: (value: number) => void;
    containerClassName?: string;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
    ({ value, onChange, containerClassName, className, ...props }, ref) => {
        // Track the raw display string so the user can clear/type freely
        const [displayValue, setDisplayValue] = useState<string>(String(value ?? ''));

        // Sync from parent when the prop value changes externally
        useEffect(() => {
            const incoming = String(value ?? '');
            // Only sync if the parent value doesn't match what we already show
            // This avoids overwriting while the user is actively typing
            if (Number(incoming) !== Number(displayValue) || (incoming === '0' && displayValue !== '0' && displayValue !== '')) {
                setDisplayValue(incoming);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            setDisplayValue(raw);
            // Only propagate valid numbers; treat empty as 0
            const num = raw === '' ? 0 : Number(raw);
            if (!isNaN(num)) {
                onChange(num);
            }
        };

        const handleIncrement = () => {
            const num = Number(displayValue) || 0;
            const next = num + (Number(props.step) || 1);
            setDisplayValue(String(next));
            onChange(next);
        };

        const handleDecrement = () => {
            const num = Number(displayValue) || 0;
            const next = num - (Number(props.step) || 1);
            setDisplayValue(String(next));
            onChange(next);
        };

        return (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }} className={containerClassName}>
                <input
                    ref={ref}
                    type="number"
                    value={displayValue}
                    onChange={handleChange}
                    className={`custom-number-input ${className || ''}`}
                    {...props}
                    style={{
                        width: '100%',
                        paddingRight: '32px', // space for arrows
                        ...props.style
                    }}
                />
                <div 
                    style={{ 
                        position: 'absolute', 
                        right: '4px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '2px',
                        background: 'transparent'
                    }}
                >
                    <button 
                        type="button" 
                        onClick={handleIncrement}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 4px',
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                    </button>
                    <button 
                        type="button" 
                        onClick={handleDecrement}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 4px',
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                </div>
                <style jsx>{`
                    .custom-number-input::-webkit-outer-spin-button,
                    .custom-number-input::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                    .custom-number-input[type=number] {
                        -moz-appearance: textfield;
                    }
                `}</style>
            </div>
        );
    }
);

NumberInput.displayName = 'NumberInput';
export default NumberInput;
