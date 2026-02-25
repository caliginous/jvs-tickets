import React, { useState } from "react";
import { Disclosure } from '@headlessui/react';
import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronRightIcon } from "@heroicons/react/solid";

function NavItem({ item, active }) {
    const isActiveRoot = active(item.path);
    const { title, path, icon, info, children } = item;

    const hasActiveSub = children?.some((child) => active(child.path)) ?? false;

    if (children) {
        return (
            <Disclosure defaultOpen={isActiveRoot || hasActiveSub}>
                {({ open }) => (
                    <>
                        <Disclosure.Button className="w-full flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors relative">
                            {icon && (
                                <span className="w-5 h-5 mr-3 flex items-center justify-center">
                                    {icon}
                                </span>
                            )}
                            <span className="flex-grow text-left capitalize">{title}</span>
                            {info && info}
                            <ChevronRightIcon
                                className={`w-4 h-4 ml-1 transition-transform duration-200 ${
                                    open ? 'rotate-90' : ''
                                }`}
                            />
                        </Disclosure.Button>

                        <Disclosure.Panel className="px-0">
                            <div className="space-y-1">
                                {children.map((child) => {
                                    const { title, path } = child;
                                    const isActiveSub = active(path);

                                    return (
                                        <Link key={title} href={path} passHref>
                                            <a className={`block px-10 py-2 text-sm transition-colors ${
                                                isActiveSub
                                                    ? 'text-primary-600 font-medium bg-primary-50'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}>
                                                {title}
                                            </a>
                                        </Link>
                                    );
                                })}
                            </div>
                        </Disclosure.Panel>
                    </>
                )}
            </Disclosure>
        );
    }

    return (
        <Link href={path} passHref>
            <a className={`block px-5 py-3 text-sm font-medium transition-colors relative ${
                isActiveRoot
                    ? 'text-primary-600 font-medium bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}>
                {icon && (
                    <span className="w-5 h-5 mr-3 flex items-center justify-center">
                        {icon}
                    </span>
                )}
                <span className="capitalize">{title}</span>
                {info && info}
                {isActiveRoot && (
                    <div className="absolute right-0 top-0 w-1 h-full bg-primary-600 rounded-l-md" />
                )}
            </a>
        </Link>
    );
}

export default function NavSection({ navConfig, ...other }) {
    const { pathname } = useRouter();
    const match = (path) => (path ? pathname === path : false);

    return (
        <nav {...other} className="pt-0 pb-4">
            <div className="space-y-1 mt-4">
                {navConfig.map((item) => (
                    <NavItem key={item.title} item={item} active={match} />
                ))}
            </div>
        </nav>
    );
}
