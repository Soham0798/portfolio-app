import React, { InputHTMLAttributes, forwardRef } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: number | string;
    onChange: (value: number) => void;
    containerClassName?: string;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
    ({ value, onChange, containerClassName, className, ...props }, ref) => {
        const handleIncrement = () => {
            onChange(Number(value) + (Number(props.step) || 1));
        };

        const handleDecrement = () => {
            onChange(Number(value) - (Number(props.step) || 1));
        };

        return (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }} className={containerClassName}>
                <input
                    ref={ref}
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
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
