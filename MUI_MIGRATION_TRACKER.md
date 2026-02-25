# MUI → Tailwind Migration Tracker

## Overview
This document tracks the progress of migrating from Material-UI (MUI) to Tailwind CSS + Headless UI components.

**Target**: Complete removal of MUI (@mui/, @emotion/, @mui/styles) and rebuild with Tailwind + Headless primitives
**Framework**: Next.js 12, React 17
**Status**: 🟡 In Progress

## Migration Phases

### Phase A: Foundations ✅ COMPLETED
- [x] Install required packages (@headlessui/react, @heroicons/react, @tanstack/react-table, react-day-picker, react-hot-toast, class-variance-authority, clsx)
- [x] Install dev dependencies (@tailwindcss/forms, prettier-plugin-tailwindcss)
- [x] Create UI kit directory (/src/ui/*)
- [x] Create utility functions (cn.ts)
- [x] Create Button component with CVA variants
- [x] Create Input component with label/error support
- [x] Create Select component using HeadlessUI Listbox
- [x] Create Dialog component using HeadlessUI Dialog + Transition
- [x] Create Card component with header/body/footer
- [x] Create toast system (react-hot-toast wrapper)
- [x] Update Tailwind config with forms plugin
- [x] Add Toaster to admin section in _app.tsx
- [x] Create UI test page (/ui-test)
- [x] Add ESLint guardrails (no-restricted-imports)
- [x] Create MUI usage checker script

### Phase B: Admin Layout & Shell 🔄 NEXT
- [ ] Replace Admin AppBar/Toolbar/Sidebar
- [ ] Replace MainCard component
- [ ] Replace NavSection component
- [ ] Replace AccountPopover component
- [ ] Replace Searchbar component
- [ ] Replace NotificationPopover component
- [ ] Remove AppBar/Toolbar/styled alpha() usage

### Phase C: Admin Dialogs & Forms
- [ ] Replace dialogs in /src/components/admin/dialogs/*
- [ ] Replace TextField, Select, Checkbox with /src/ui equivalents
- [ ] Replace DateTimePicker with react-day-picker combos

### Phase D: Admin Tables
- [ ] Orders, Users, Events lists
- [ ] Introduce TanStack Table
- [ ] Unify table header, row, empty state, pagination

### Phase E: Public Booking Flow
- [ ] StepperContainer.tsx: Replace MUI Stepper
- [ ] EventSelection/* components (Accordion, Typography, Box → Tailwind + HeadlessUI)
- [ ] Form pages (information, checkout, payment, refund)
- [ ] Payment buttons: remove LoadingButton

### Phase F: Purge MUI
- [ ] Remove StoreThemeConfig wrapper from _app.tsx
- [ ] Delete StoreThemeConfig component
- [ ] npm remove all MUI/Emotion deps
- [ ] CI blocks any @mui import
- [ ] depcheck to verify removal

## Current Status

### ✅ Completed Components
- **Button**: CVA variants (solid, outline, ghost, danger, secondary), sizes (sm, md, lg, icon), loading state
- **Input**: Label, error, helper text, start/end adornments
- **Select**: HeadlessUI Listbox with proper styling and accessibility
- **Dialog**: HeadlessUI Dialog with Transition, Header/Body/Footer components
- **Card**: Header, Title, Description, Content, Footer sections
- **Toast**: react-hot-toast wrapper with success/error/loading helpers

### 🔄 In Progress
- Setting up foundation for admin layout migration
- Testing UI components

### 📋 Next Steps
1. **Phase B**: Start migrating admin layout components
2. **Testing**: Verify all UI components work correctly
3. **Documentation**: Update component usage examples

## File Structure

```
src/ui/
├── index.ts          # Export all components
├── cn.ts            # Utility function (clsx + tailwind-merge)
├── button.tsx       # Button with CVA variants
├── input.tsx        # Input with label/error support
├── select.tsx       # Select using HeadlessUI Listbox
├── dialog.tsx       # Dialog using HeadlessUI Dialog
├── card.tsx         # Card with sections
├── toast.ts         # Toast helpers
└── toaster.tsx      # Toaster component
```

## Testing

- **UI Test Page**: `/ui-test` - Demonstrates all new components
- **Build Status**: ✅ Building successfully
- **ESLint**: ✅ Guardrails in place
- **MUI Checker**: ✅ Script created for CI integration

## Notes

- Using HeadlessUI v1 for React 17 compatibility
- Using Heroicons v1 for React 17 compatibility
- Tailwind forms plugin added for better form styling
- Toast system replaces notistack
- All components use consistent Tailwind design tokens

## Migration Commands

```bash
# Check MUI usage
./check-mui-usage.sh

# Build project
npm run build

# Run development server
npm run dev
```

---

**Last Updated**: $(date)
**Phase**: A (Foundations) - COMPLETED
**Next Phase**: B (Admin Layout & Shell)
**Current MUI Imports**: 286 (as of $(date))
