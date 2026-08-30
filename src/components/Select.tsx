'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    className?: string;
}

const getAvatarColor = (name: string) => {
    switch (name.toLowerCase()) {
        case 'sameer': return '#4d8dff';
        case 'snehal': return '#6a5cf0';
        case 'soham': return '#2fb8c6';
        case 'combined': return 'linear-gradient(135deg, #4d8dff, #6a5cf0)';
        default: return '#8b949e';
    }
};

export default function Select({ value, onChange, options, className = '' }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);
    const triggerLabel = selectedOption ? selectedOption.label : 'Select...';
    const triggerColor = getAvatarColor(triggerLabel);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div
            ref={containerRef}
            className={`select-wrap ${className}`}
            style={{ position: 'relative', width: '100%' }}
        >
            {/* Trigger button */}
            <div
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-card)',
                    border: isOpen ? '1px solid var(--accent-primary, #4d8dff)' : '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '15px', fontWeight: 500, cursor: 'pointer',
                    boxShadow: 'var(--card-shadow, 0 2px 8px rgba(0,0,0,0.07))',
                    transition: 'border-color 0.2s ease',
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                    {selectedOption && (
                        <span style={{
                            width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700,
                            marginRight: '10px', color: '#fff', flexShrink: 0, background: triggerColor,
                        }}>
                            {triggerLabel[0].toUpperCase()}
                        </span>
                    )}
                    {triggerLabel}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--accent-primary, #4d8dff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '12px',
                            zIndex: 100, overflow: 'hidden', transformOrigin: 'top',
                            boxShadow: 'var(--card-shadow, 0 8px 32px rgba(0,0,0,0.12))',
                        }}
                    >
                        {options.map((option, index) => {
                            const isSelected = value === option.value;
                            const optionColor = getAvatarColor(option.label);
                            return (
                                <div
                                    key={option.value}
                                    onClick={() => { onChange(option.value); setIsOpen(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 16px', fontSize: '15px', cursor: 'pointer',
                                        borderBottom: index < options.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                        borderLeft: isSelected ? '3px solid var(--accent-primary, #4d8dff)' : '3px solid transparent',
                                        background: isSelected ? 'rgba(77,141,255,0.10)' : 'transparent',
                                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontWeight: isSelected ? 600 : 400,
                                        transition: 'background 0.15s ease, color 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = 'rgba(77,141,255,0.07)';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                        }
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{
                                            width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex',
                                            alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700,
                                            marginRight: '10px', color: '#fff', flexShrink: 0, background: optionColor,
                                        }}>
                                            {option.label[0].toUpperCase()}
                                        </span>
                                        {option.label}
                                    </span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                        stroke="var(--accent-primary, #4d8dff)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                        style={{ opacity: isSelected ? 1 : 0, transition: 'opacity 0.15s ease' }}>
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
