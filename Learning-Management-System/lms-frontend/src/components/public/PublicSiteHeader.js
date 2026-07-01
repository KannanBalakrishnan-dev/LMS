import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { LanguageOutlined, Menu as MenuIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import logoImage from '../../assets/vdartacademylogo1 3.png';

const colors = {
    white: '#ffffff',
    ink: '#121212',
};

const fontFamily = '"Poppins", "Segoe UI", sans-serif';
const pageGutter = { xs: 3, sm: 4, md: 6, lg: 8 };

const desktopNavLinkSx = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    fontFamily,
    fontSize: '1.2rem',
    lineHeight: 1,
    color: colors.ink,
    textDecoration: 'none',
    fontWeight: 600,
    position: 'relative',
    whiteSpace: 'nowrap',
};

const desktopAuthButtonSx = {
    minWidth: 63,
    minHeight: 10,
    px: 0.2,
    borderRadius: '7px',
    backgroundColor: '#FCD980',
    color: colors.ink,
    textTransform: 'none',
    fontFamily: '"Proxima Nova", sans-serif',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 'normal',
    letterSpacing: 0,
    boxShadow: 'none',
    '&:hover': {
        backgroundColor: '#FCD980',
        boxShadow: 'none',
    },
};

const mobileNavButtonSx = (isActive) => ({
    justifyContent: 'flex-start',
    textTransform: 'none',
    color: colors.ink,
    fontWeight: isActive ? 700 : 600,
    borderRadius: '10px',
    px: 1.25,
    py: 1,
    backgroundColor: isActive ? 'rgba(28, 30, 83, 0.08)' : 'transparent',
    '&:hover': {
        backgroundColor: 'rgba(28, 30, 83, 0.08)',
    },
});

export const PUBLIC_SITE_HEADER_HEIGHT = 74;

function getNavLinkProps(item) {
    if (item.to) {
        return {
            component: RouterLink,
            to: item.to,
        };
    }

    return {
        component: 'a',
        href: item.href || '#',
    };
}

export default function PublicSiteHeader({
    navItems,
    activeItemId,
    logoTo = '/home',
    logoHref,
    onLogoClick,
}) {
    const { user } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navLinksRef = useRef({});
    const [navIndicator, setNavIndicator] = useState({ left: 0, width: 0, opacity: 0 });

    const dashboardPath =
        user?.user_type === 'ADMIN' || user?.user_type === 'STAFF' ? '/admin' : '/userlogin';
    const logoLinkProps = logoHref
        ? {
              component: 'a',
              href: logoHref,
          }
        : {
              component: RouterLink,
              to: logoTo,
          };

    useEffect(() => {
        const updateIndicator = () => {
            const activeLink = navLinksRef.current[activeItemId];
            if (!activeLink) {
                setNavIndicator((previous) => ({ ...previous, opacity: 0 }));
                return;
            }

            setNavIndicator({
                left: activeLink.offsetLeft,
                width: activeLink.offsetWidth,
                opacity: 1,
            });
        };

        updateIndicator();
        window.addEventListener('resize', updateIndicator);

        return () => window.removeEventListener('resize', updateIndicator);
    }, [activeItemId, navItems]);

    return (
        <>
            <Box
                sx={{
                    height: PUBLIC_SITE_HEADER_HEIGHT,
                    minHeight: PUBLIC_SITE_HEADER_HEIGHT,
                    maxHeight: PUBLIC_SITE_HEADER_HEIGHT,
                    backgroundColor: colors.white,
                    boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                    width:'100%',
                    maxWidth:'1440px',
                    mx:'auto',
                    px: pageGutter,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 30,
                    fontFamily,
                    '& .MuiTypography-root, & .MuiButton-root': {
                        fontFamily,
                    },
             }}
            >
                <Box
                    {...logoLinkProps}
                    onClick={onLogoClick}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        width: { xs: 72, md: 86 },
                        height: { xs: 52, md: 62 },
                        flexShrink: 0,
                        textDecoration: 'none',
                    }}
                >
                    <Box
                        component="img"
                        src={logoImage}
                        alt="VDart Academy"
                        sx={{
                            width: { xs: 72, md: 86 },
                            height: { xs: 52, md: 62 },
                            objectFit: 'contain',
                            display: 'block',
                        }}
                    />
                </Box>

                <IconButton
                    sx={{
                        display: { xs: 'flex', sm: 'none' },
                        color: colors.ink,
                        ml: 'auto',
                    }}
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <MenuIcon />
                </IconButton>

                <Stack
                    direction="row"
                    spacing="28px"
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        display: { xs: 'none', sm: 'flex' },
                        position: 'relative',
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            left: `${navIndicator.left}px`,
                            bottom: '-4px',
                            width: `${navIndicator.width}px`,
                            height: '2px',
                            opacity: navIndicator.opacity,
                            transition:
                                'left 220ms cubic-bezier(0.22, 1, 0.36, 1), width 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease',
                        }}
                    >
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: colors.ink,
                                borderRadius: '999px',
                                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
                            }}
                        />
                    </Box>
                    {navItems.map((item) => (
                        <Box
                            key={item.id}
                            {...getNavLinkProps(item)}
                            onClick={item.onClick}
                            ref={(node) => {
                                if (node) {
                                    navLinksRef.current[item.id] = node;
                                }
                            }}
                            sx={desktopNavLinkSx}
                        >
                            {item.label}
                        </Box>
                    ))}
                </Stack>

                <Stack
                    direction="row"
                    spacing="10px"
                    alignItems="center"
                    sx={{ flexShrink: 0, display: { xs: 'none', sm: 'flex' } }}
                >
                    <Stack
                        direction="row"
                        spacing={0.9}
                        alignItems="center"
                        sx={{
                            minWidth: 62,
                            height: 32,
                            px: 1.25,
                            borderRadius: '999px',
                            justifyContent: 'center',
                            display: { xs: 'none', sm: 'flex' },
                        }}
                    >
                        <LanguageOutlined sx={{ fontSize: 22, color: colors.ink }} />
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1 }}>
                            EN
                        </Typography>
                    </Stack>
                    {user ? (
                        <Button component={RouterLink} to={dashboardPath} sx={desktopAuthButtonSx}>
                            Dashboard
                        </Button>
                    ) : (
                        <>
                            <Button component={RouterLink} to="/login" sx={desktopAuthButtonSx}>
                                Login
                            </Button>
                            <Button component={RouterLink} to="/register" sx={desktopAuthButtonSx}>
                                Sign up
                            </Button>
                        </>
                    )}
                </Stack>
            </Box>

            <Drawer
                anchor="right"
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
            >
                <Box sx={{ width: 250, p: 2 }}>
                    <Stack spacing={2}>
                        {navItems.map((item) => {
                            const isActive = item.id === activeItemId;

                            return (
                                <Button
                                    key={item.id}
                                    {...getNavLinkProps(item)}
                                    onClick={(event) => {
                                        item.onClick?.(event);
                                        setMobileMenuOpen(false);
                                    }}
                                    sx={mobileNavButtonSx(isActive)}
                                >
                                    {item.label}
                                </Button>
                            );
                        })}
                        <Divider />
                        <Stack direction="row" spacing={1} alignItems="center">
                            <LanguageOutlined sx={{ fontSize: 22, color: colors.ink }} />
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1 }}>
                                EN
                            </Typography>
                        </Stack>
                        {user ? (
                            <Button
                                component={RouterLink}
                                to={dashboardPath}
                                sx={desktopAuthButtonSx}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Button>
                        ) : (
                            <>
                                <Button
                                    component={RouterLink}
                                    to="/login"
                                    sx={desktopAuthButtonSx}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Login
                                </Button>
                                <Button
                                    component={RouterLink}
                                    to="/register"
                                    sx={desktopAuthButtonSx}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Sign up
                                </Button>
                            </>
                        )}
                    </Stack>
                </Box>
            </Drawer>
        </>
    );
}

