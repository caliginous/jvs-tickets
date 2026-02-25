MUI LEFTOVERS — CODEBASE AUDIT (ASCII)
Generated: 2025-08-22

PACKAGE.JSON DEPENDENCIES WITH @mui/* OR EMOTION
package.json
- @emotion/react: ^11.10.4
- @emotion/styled: ^11.10.4
- @mui/icons-material: ^5.10.3
- @mui/lab: ^5.0.0-alpha.99
- @mui/material: ^5.10.5
- @mui/styles: ^5.10.3
- @mui/x-date-pickers: ^5.0.3
nested/package.json
- @emotion/react: ^11.10.4
- @emotion/styled: ^11.10.4
- @mui/icons-material: ^5.10.3
- @mui/lab: ^5.0.0-alpha.99
- @mui/material: ^5.10.5
- @mui/styles: ^5.10.3
- @mui/x-date-pickers: ^5.0.3
src2/package.json
- @emotion/react: ^11.10.4
- @emotion/styled: ^11.10.4
- @mui/icons-material: ^5.10.3
- @mui/lab: ^5.0.0-alpha.99
- @mui/material: ^5.10.5
- @mui/styles: ^5.10.3
- @mui/x-date-pickers: ^5.0.3

SUMMARY COUNTS BY MODULE BASE
@mui/icons-material: 248 import lines
@mui/material: 212 import lines
@mui/system: 74 import lines
@mui/lab: 24 import lines
@mui/x-date-pickers: 12 import lines
@mui/styles: 2 import lines

TOP FILES BY NUMBER OF MUI IMPORT LINES (first 20)
	1.	nested/src/components/admin/layout/Sidebar.tsx — 12 lines
	2.	src2/src/components/admin/layout/Sidebar.tsx — 12 lines
	3.	nested/src/pages/admin/reports.tsx — 11 lines
	4.	src2/src/pages/admin/reports.tsx — 11 lines
	5.	nested/src/pages/admin/events/[eventId]/report.tsx — 10 lines
	6.	src2/src/pages/admin/events/[eventId]/report.tsx — 10 lines
	7.	nested/src/components/admin/layout/NotificationPopover.tsx — 9 lines
	8.	src2/src/components/admin/layout/NotificationPopover.tsx — 9 lines
	9.	nested/src/pages/admin/orders.tsx — 7 lines
	10.	src2/src/pages/admin/orders.tsx — 7 lines
	11.	nested/src/components/admin/OrderInformationDetails.tsx — 6 lines
	12.	nested/src/components/admin/layout/dashboard/RevenueGraphCard.tsx — 6 lines
	13.	nested/src/components/admin/dialogs/SeatMapDialog.tsx — 6 lines
	14.	nested/src/pages/admin/ticket-scan.tsx — 6 lines
	15.	nested/src/pages/admin/options.tsx — 6 lines
	16.	nested/src/pages/admin/user/settings.tsx — 6 lines
	17.	nested/src/pages/admin/events/index.tsx — 6 lines
	18.	src2/src/components/admin/OrderInformationDetails.tsx — 6 lines
	19.	src2/src/components/admin/layout/dashboard/RevenueGraphCard.tsx — 6 lines
	20.	src2/src/components/admin/dialogs/SeatMapDialog.tsx — 6 lines

COMPACT PER-FILE LIST (module -> exact line numbers)

Each file below shows the @mui/* module base and the exact line numbers
where it is imported.

nested/src/components/TextInputDialog.tsx
@mui/icons-material: L2
@mui/material: L1

nested/src/components/admin/GTCEditor.tsx
@mui/icons-material: L3, L4
@mui/material: L2

nested/src/components/admin/TicketScans.tsx
@mui/icons-material: L3, L4
@mui/material: L2

nested/src/components/admin/dialogs/ConfirmDialog.tsx
@mui/material: L1

nested/src/components/admin/dialogs/EventDateDialog.tsx
@mui/icons-material: L5, L6
@mui/material: L2, L3, L4
@mui/x-date-pickers: L11, L15, L16

nested/src/components/admin/dialogs/SeatMapDialog.tsx
@mui/icons-material: L3
@mui/lab: L5
@mui/material: L2, L4, L6

nested/src/components/admin/dialogs/TemplatePreview.tsx
@mui/icons-material: L3
@mui/material: L1, L2

nested/src/components/admin/layout/AccountPopover.tsx
@mui/icons-material: L2, L3, L4, L5, L6
@mui/material: L1

nested/src/components/admin/layout/MainCard.tsx
@mui/material: L2, L3

nested/src/components/admin/layout/Navbar.tsx
@mui/icons-material: L3, L4, L5, L6
@mui/material: L1, L2
@mui/system: L7

nested/src/components/admin/layout/NotificationPopover.tsx
@mui/icons-material: L3, L4, L5, L6, L7, L8
@mui/material: L1, L2
@mui/system: L9

nested/src/components/admin/layout/Sidebar.tsx
@mui/icons-material: L3, L4, L5, L6, L7, L8, L9, L10, L11
@mui/material: L1, L2, L12

nested/src/components/admin/layout/dashboard/RevenueGraphCard.tsx
@mui/icons-material: L3
@mui/material: L2, L4, L5, L6
@mui/system: L1

nested/src/components/admin/layout/dashboard/WeekOrdersCards.tsx
@mui/icons-material: L2, L3, L4, L5
@mui/material: L1
@mui/system: L6

nested/src/components/admin/order/OrderInformationCard.tsx
@mui/material: L1, L2
@mui/system: L3

nested/src/components/admin/OrderInformationDetails.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1, L5
@mui/system: L6

nested/src/components/form/AcceptGTC.tsx
@mui/material: L1

nested/src/components/form/FormAutocomplete.tsx
@mui/icons-material: L3
@mui/lab: L2
@mui/material: L1
@mui/system: L4

nested/src/components/form/FormCheckbox.tsx
@mui/material: L1

nested/src/components/form/FormSelect.tsx
@mui/icons-material: L2
@mui/material: L1

nested/src/components/form/FormTextInput.tsx
@mui/material: L1

nested/src/components/form/LoaderButton.tsx
@mui/icons-material: L2
@mui/material: L1

nested/src/components/store/ProductCard.tsx
@mui/icons-material: L2, L3
@mui/material: L1

nested/src/components/store/ProductCardWithQuantity.tsx
@mui/icons-material: L2, L3
@mui/material: L1

nested/src/components/store/ProductCategoryList.tsx
@mui/icons-material: L2
@mui/material: L1

nested/src/components/store/ProductOptionDisplay.tsx
@mui/icons-material: L3
@mui/material: L1, L2

nested/src/components/store/ProductQuantityControl.tsx
@mui/icons-material: L2, L3
@mui/material: L1

nested/src/components/store/ProductSelection.tsx
@mui/icons-material: L2, L3
@mui/material: L1

nested/src/components/store/ProductVariantSelector.tsx
@mui/icons-material: L2
@mui/material: L1

nested/src/components/store/ShoppingCart.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

nested/src/components/store/StoreSearchBar.tsx
@mui/icons-material: L2, L3
@mui/material: L1

nested/src/components/store/TicketGroup.tsx
@mui/icons-material: L3
@mui/material: L1, L2

nested/src/components/store/VariantChip.tsx
@mui/icons-material: L2
@mui/material: L1

nested/src/components/StoreThemeConfig.tsx
@mui/material: L2

nested/src/pages/_app.tsx
@mui/material: L6

nested/src/pages/admin/events/[eventId]/index.tsx
@mui/icons-material: L3
@mui/material: L1, L2

nested/src/pages/admin/events/[eventId]/report.tsx
@mui/icons-material: L5, L6, L7
@mui/lab: L4
@mui/material: L1, L2, L3

nested/src/pages/admin/events/[eventId]/ticket/[ticketType]/edit.tsx
@mui/material: L1

nested/src/pages/admin/events/create.tsx
@mui/icons-material: L2, L3, L4, L5
@mui/material: L1

nested/src/pages/admin/events/discount-codes/index.tsx
@mui/icons-material: L45
@mui/material: L1, L2, L3
@mui/x-date-pickers: L43, L44, L46

nested/src/pages/admin/events/index.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

nested/src/pages/admin/events/option-groups/index.tsx
@mui/icons-material: L2, L3
@mui/material: L1

nested/src/pages/admin/events/options.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

nested/src/pages/admin/events/ticket-types/create.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

nested/src/pages/admin/events/ticket-types/index.tsx
@mui/icons-material: L2, L3
@mui/material: L1

nested/src/pages/admin/index.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

nested/src/pages/admin/options.tsx
@mui/icons-material: L2, L3
@mui/material: L1

nested/src/pages/admin/orders.tsx
@mui/icons-material: L4, L5, L6
@mui/lab: L3
@mui/material: L1, L2

nested/src/pages/admin/reports.tsx
@mui/icons-material: L11, L12, L13, L14, L15
@mui/material: L1, L2, L3, L4, L5, L6

nested/src/pages/admin/ticket-scan.tsx
@mui/icons-material: L2
@mui/material: L1, L3, L4, L5, L6

nested/src/pages/admin/user/settings.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

nested/src/pages/events/[eventId]/index.tsx
@mui/icons-material: L2
@mui/material: L1

nested/src/pages/index.tsx
@mui/icons-material: L2, L3
@mui/material: L1

nested/src/pages/shop/[shopId]/categories/[categoryId]/[productId]/index.tsx
@mui/icons-material: L3, L4, L5
@mui/material: L1, L2

nested/src/pages/shop/[shopId]/categories/[categoryId]/index.tsx
@mui/icons-material: L3
@mui/material: L1, L2

nested/src/pages/shop/[shopId]/checkout.tsx
@mui/icons-material: L2
@mui/material: L1

nested/src/pages/shop/[shopId]/index.tsx
@mui/icons-material: L4
@mui/material: L1, L2, L3

nested/src/pages/shop/[shopId]/orders/[orderId].tsx
@mui/icons-material: L2
@mui/material: L1

nested/src/pages/shop/[shopId]/products/[productId]/index.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

nested/src/pages/shop/index.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

src2/src/components/TextInputDialog.tsx
@mui/icons-material: L2
@mui/material: L1

src2/src/components/admin/GTCEditor.tsx
@mui/icons-material: L3, L4
@mui/material: L2

src2/src/components/admin/TicketScans.tsx
@mui/icons-material: L3, L4
@mui/material: L2

src2/src/components/admin/dialogs/ConfirmDialog.tsx
@mui/material: L1

src2/src/components/admin/dialogs/EventDateDialog.tsx
@mui/icons-material: L5, L6
@mui/material: L2, L3, L4
@mui/x-date-pickers: L11, L15, L16

src2/src/components/admin/dialogs/SeatMapDialog.tsx
@mui/icons-material: L3
@mui/lab: L5
@mui/material: L2, L4, L6

src2/src/components/admin/dialogs/TemplatePreview.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src2/src/components/admin/layout/AccountPopover.tsx
@mui/icons-material: L2, L3, L4, L5, L6
@mui/material: L1

src2/src/components/admin/layout/MainCard.tsx
@mui/material: L2, L3

src2/src/components/admin/layout/Navbar.tsx
@mui/icons-material: L3, L4, L5, L6
@mui/material: L1, L2
@mui/system: L7

src2/src/components/admin/layout/NotificationPopover.tsx
@mui/icons-material: L3, L4, L5, L6, L7, L8
@mui/material: L1, L2
@mui/system: L9

src2/src/components/admin/layout/Sidebar.tsx
@mui/icons-material: L3, L4, L5, L6, L7, L8, L9, L10, L11
@mui/material: L1, L2, L12

src2/src/components/admin/layout/dashboard/RevenueGraphCard.tsx
@mui/icons-material: L3
@mui/material: L2, L4, L5, L6
@mui/system: L1

src2/src/components/admin/layout/dashboard/WeekOrdersCards.tsx
@mui/icons-material: L2, L3, L4, L5
@mui/material: L1
@mui/system: L6

src2/src/components/admin/order/OrderInformationCard.tsx
@mui/material: L1, L2
@mui/system: L3

src2/src/components/admin/OrderInformationDetails.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1, L5
@mui/system: L6

src2/src/components/form/AcceptGTC.tsx
@mui/material: L1

src2/src/components/form/FormAutocomplete.tsx
@mui/icons-material: L3
@mui/lab: L2
@mui/material: L1
@mui/system: L4

src2/src/components/form/FormCheckbox.tsx
@mui/material: L1

src2/src/components/form/FormSelect.tsx
@mui/icons-material: L2
@mui/material: L1

src2/src/components/form/FormTextInput.tsx
@mui/material: L1

src2/src/components/form/LoaderButton.tsx
@mui/icons-material: L2
@mui/material: L1

src2/src/components/store/ProductCard.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src2/src/components/store/ProductCardWithQuantity.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src2/src/components/store/ProductCategoryList.tsx
@mui/icons-material: L2
@mui/material: L1

src2/src/components/store/ProductOptionDisplay.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src2/src/components/store/ProductQuantityControl.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src2/src/components/store/ProductSelection.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src2/src/components/store/ProductVariantSelector.tsx
@mui/icons-material: L2
@mui/material: L1

src2/src/components/store/ShoppingCart.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

src2/src/components/store/StoreSearchBar.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src2/src/components/store/TicketGroup.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src2/src/components/store/VariantChip.tsx
@mui/icons-material: L2
@mui/material: L1

src2/src/components/StoreThemeConfig.tsx
@mui/material: L2

src2/src/pages/_app.tsx
@mui/material: L6

src2/src/pages/admin/events/[eventId]/index.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src2/src/pages/admin/events/[eventId]/report.tsx
@mui/icons-material: L5, L6, L7
@mui/lab: L4
@mui/material: L1, L2, L3

src2/src/pages/admin/events/[eventId]/ticket/[ticketType]/edit.tsx
@mui/material: L1

src2/src/pages/admin/events/create.tsx
@mui/icons-material: L2, L3, L4, L5
@mui/material: L1

src2/src/pages/admin/events/discount-codes/index.tsx
@mui/icons-material: L45
@mui/material: L1, L2, L3
@mui/x-date-pickers: L43, L44, L46

src2/src/pages/admin/events/index.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

src2/src/pages/admin/events/option-groups/index.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src2/src/pages/admin/events/options.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

src2/src/pages/admin/events/ticket-types/create.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

src2/src/pages/admin/events/ticket-types/index.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src2/src/pages/admin/index.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

src2/src/pages/admin/options.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src2/src/pages/admin/orders.tsx
@mui/icons-material: L4, L5, L6
@mui/lab: L3
@mui/material: L1, L2

src2/src/pages/admin/reports.tsx
@mui/icons-material: L11, L12, L13, L14, L15
@mui/material: L1, L2, L3, L4, L5, L6

src2/src/pages/admin/ticket-scan.tsx
@mui/icons-material: L2
@mui/material: L1, L3, L4, L5, L6

src2/src/pages/admin/user/settings.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

src2/src/pages/events/[eventId]/index.tsx
@mui/icons-material: L2
@mui/material: L1

src2/src/pages/index.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src2/src/pages/shop/[shopId]/categories/[categoryId]/[productId]/index.tsx
@mui/icons-material: L3, L4, L5
@mui/material: L1, L2

src2/src/pages/shop/[shopId]/categories/[categoryId]/index.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src2/src/pages/shop/[shopId]/checkout.tsx
@mui/icons-material: L2
@mui/material: L1

src2/src/pages/shop/[shopId]/index.tsx
@mui/icons-material: L4
@mui/material: L1, L2, L3

src2/src/pages/shop/[shopId]/orders/[orderId].tsx
@mui/icons-material: L2
@mui/material: L1

src2/src/pages/shop/[shopId]/products/[productId]/index.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

src2/src/pages/shop/index.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

src/components/TextInputDialog.tsx
@mui/icons-material: L2
@mui/material: L1

src/components/admin/GTCEditor.tsx
@mui/icons-material: L3, L4
@mui/material: L2

src/components/admin/TicketScans.tsx
@mui/icons-material: L3, L4
@mui/material: L2

src/components/admin/dialogs/ConfirmDialog.tsx
@mui/material: L1

src/components/admin/dialogs/EventDateDialog.tsx
@mui/icons-material: L5, L6
@mui/material: L2, L3, L4
@mui/x-date-pickers: L11, L15, L16

src/components/admin/dialogs/SeatMapDialog.tsx
@mui/icons-material: L3
@mui/lab: L5
@mui/material: L2, L4, L6

src/components/admin/dialogs/TemplatePreview.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src/components/admin/layout/AccountPopover.tsx
@mui/icons-material: L2, L3, L4, L5, L6
@mui/material: L1

src/components/admin/layout/MainCard.tsx
@mui/material: L2, L3

src/components/admin/layout/Navbar.tsx
@mui/icons-material: L3, L4, L5, L6
@mui/material: L1, L2
@mui/system: L7

src/components/admin/layout/NotificationPopover.tsx
@mui/icons-material: L3, L4, L5, L6, L7, L8
@mui/material: L1, L2
@mui/system: L9

src/components/admin/layout/Sidebar.tsx
@mui/icons-material: L3, L4, L5, L6, L7, L8, L9, L10, L11
@mui/material: L1, L2, L12

src/components/admin/layout/dashboard/RevenueGraphCard.tsx
@mui/icons-material: L3
@mui/material: L2, L4, L5, L6
@mui/system: L1

src/components/admin/layout/dashboard/WeekOrdersCards.tsx
@mui/icons-material: L2, L3, L4, L5
@mui/material: L1
@mui/system: L6

src/components/admin/order/OrderInformationCard.tsx
@mui/material: L1, L2
@mui/system: L3

src/components/admin/OrderInformationDetails.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1, L5
@mui/system: L6

src/components/form/AcceptGTC.tsx
@mui/material: L1

src/components/form/FormAutocomplete.tsx
@mui/icons-material: L3
@mui/lab: L2
@mui/material: L1
@mui/system: L4

src/components/form/FormCheckbox.tsx
@mui/material: L1

src/components/form/FormSelect.tsx
@mui/icons-material: L2
@mui/material: L1

src/components/form/FormTextInput.tsx
@mui/material: L1

src/components/form/LoaderButton.tsx
@mui/icons-material: L2
@mui/material: L1

src/components/store/ProductCard.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src/components/store/ProductCardWithQuantity.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src/components/store/ProductCategoryList.tsx
@mui/icons-material: L2
@mui/material: L1

src/components/store/ProductOptionDisplay.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src/components/store/ProductQuantityControl.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src/components/store/ProductSelection.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src/components/store/ProductVariantSelector.tsx
@mui/icons-material: L2
@mui/material: L1

src/components/store/ShoppingCart.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

src/components/store/StoreSearchBar.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src/components/store/TicketGroup.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src/components/store/VariantChip.tsx
@mui/icons-material: L2
@mui/material: L1

src/components/StoreThemeConfig.tsx
@mui/material: L2

src/pages/_app.tsx
@mui/material: L6

src/pages/admin/events/[eventId]/index.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src/pages/admin/events/[eventId]/report.tsx
@mui/icons-material: L5, L6, L7
@mui/lab: L4
@mui/material: L1, L2, L3

src/pages/admin/events/[eventId]/ticket/[ticketType]/edit.tsx
@mui/material: L1

src/pages/admin/events/create.tsx
@mui/icons-material: L2, L3, L4, L5
@mui/material: L1

src/pages/admin/events/discount-codes/index.tsx
@mui/icons-material: L45
@mui/material: L1, L2, L3
@mui/x-date-pickers: L43, L44, L46

src/pages/admin/events/index.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

src/pages/admin/events/option-groups/index.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src/pages/admin/events/options.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

src/pages/admin/events/ticket-types/create.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

src/pages/admin/events/ticket-types/index.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src/pages/admin/index.tsx
@mui/icons-material: L2, L3, L4
@mui/material: L1

src/pages/admin/options.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src/pages/admin/orders.tsx
@mui/icons-material: L4, L5, L6
@mui/lab: L3
@mui/material: L1, L2

src/pages/admin/reports.tsx
@mui/icons-material: L11, L12, L13, L14, L15
@mui/material: L1, L2, L3, L4, L5, L6

src/pages/admin/ticket-scan.tsx
@mui/icons-material: L2
@mui/material: L1, L3, L4, L5, L6

src/pages/admin/user/settings.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

src/pages/events/[eventId]/index.tsx
@mui/icons-material: L2
@mui/material: L1

src/pages/index.tsx
@mui/icons-material: L2, L3
@mui/material: L1

src/pages/shop/[shopId]/categories/[categoryId]/[productId]/index.tsx
@mui/icons-material: L3, L4, L5
@mui/material: L1, L2

src/pages/shop/[shopId]/categories/[categoryId]/index.tsx
@mui/icons-material: L3
@mui/material: L1, L2

src/pages/shop/[shopId]/checkout.tsx
@mui/icons-material: L2
@mui/material: L1

src/pages/shop/[shopId]/index.tsx
@mui/icons-material: L4
@mui/material: L1, L2, L3

src/pages/shop/[shopId]/orders/[orderId].tsx
@mui/icons-material: L2
@mui/material: L1

src/pages/shop/[shopId]/products/[productId]/index.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

src/pages/shop/index.tsx
@mui/icons-material: L3, L4
@mui/material: L1, L2

(END OF COMPACT IMPORT LIST)

APPENDIX A — makeStyles / withStyles occurrences

nested/src/components/EventSelection/EventSelectionEntry.tsx
L8: import { makeStyles } from “@mui/styles”;
src2/src/components/EventSelection/EventSelectionEntry.tsx
L8: import { makeStyles } from “@mui/styles”;
(also see the same files importing Theme and Accordion from @mui/material)

APPENDIX B — Mui* classnames in tests or code (will break after migration)

src2/cypress/support/commands.js
L60: cy.get(”.MuiAccordion-root”).eq(1).click();
L246: cy.get(”.MuiAutocomplete-popper”).children().first().click();
L249: cy.get(”.MuiAutocomplete-popper”).children().first().click();
src2/cypress/e2e/shop/options.spec.js
L125: cy.get(”.MuiAutocomplete-popper”).children().first().click();
L128: cy.get(”.MuiAutocomplete-popper”).children().first().click();
src2/cypress/e2e/shop/index.spec.js
L247: cy.get(”.MuiAutocomplete-popper”).children().first().click();
L250: cy.get(”.MuiAutocomplete-popper”).children().first().click();
L528: cy.get(”.MuiAccordion-root”).should(“exist”);
L529: cy.get(”.MuiAccordion-root”).click();
L530: cy.get(”.MuiAccordionDetails-root .MuiTypography-body1”).should(“have.length”, 2);
