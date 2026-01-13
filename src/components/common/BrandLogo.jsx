import React from 'react';
import clsx from 'clsx';

export const BrandLogo = ({ className, size = "h-8" }) => {
    return (
        <img
            src="/logo2befitancho.PNG"
            alt="2BEFIT"
            className={clsx("w-auto object-contain", size, className)}
        />
    );
};

export const BrandIcon = ({ className, size = "w-12 h-12" }) => {
    return (
        <img
            src="/Logocompact.png"
            alt="2B"
            className={clsx("object-contain", size, className)}
        />
    );
};
