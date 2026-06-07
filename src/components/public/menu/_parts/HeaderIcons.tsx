import React from "react";

export function PinIcon() {
    return (
        <svg
            width="11"
            height="13"
            viewBox="0 0 11 13"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
        >
            <path
                d="M5.5 0C3.015 0 1 2.015 1 4.5c0 3.375 4.5 8.5 4.5 8.5S10 7.875 10 4.5C10 2.015 7.985 0 5.5 0Zm0 6.25A1.75 1.75 0 1 1 5.5 2.75a1.75 1.75 0 0 1 0 3.5Z"
                fill="currentColor"
            />
        </svg>
    );
}

export function ClockIcon() {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
        >
            <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.5" />
            <path
                d="M6 3v3.25L8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
