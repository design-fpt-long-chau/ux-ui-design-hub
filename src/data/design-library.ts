import type { BusinessUnit, Flow, Screen, ScreenGroup } from "@/types/design-library";

const loginSlugs = ["lc-splash-screen", "lc-login", "lc-login-input-default", "lc-login-otp-default", "lc-homepage"];

const groupSeed = [
  ["app-entry", "Đăng nhập", ["LC Splash Screen", "LC Login", "LC Login Input Default", "LC Login OTP Default", "LC Homepage"]],
  ["home", "Home", ["Trang chủ", "Menu tiện ích"]],
  ["shopping", "Shopping / Product", ["Tìm kiếm & chọn sản phẩm", "Chi tiết sản phẩm", "Chọn mua", "Chat với tư vấn viên"]],
  ["cart", "Cart", ["Giỏ hàng"]],
  ["checkout", "Checkout", ["Thông tin mua hàng", "Chọn phương thức nhận hàng", "Địa chỉ giao hàng / Định vị", "Chọn phương thức thanh toán", "Hoàn tất đặt hàng"]],
  ["pharmacist-chat", "Chat & Tư vấn Dược sĩ", ["Chat với Dược sĩ", "Gửi sản phẩm", "Gửi đơn hàng", "Gửi hình ảnh", "Gửi đơn thuốc"]],
  ["medicine-reminder", "Nhắc uống thuốc", ["Nhắc uống thuốc", "Tạo lịch nhắc", "Cập nhật đơn thuốc", "Chụp đơn thuốc", "Tải ảnh", "Nhập đơn bằng tay", "Tìm thuốc", "Thêm thuốc", "Thông tin đơn thuốc", "Thêm liều lượng", "Kiểm tra / chỉnh sửa", "Hẹn giờ nhắc", "Liều thuốc trong ngày", "Đơn thuốc của tôi", "Chi tiết đơn thuốc"]],
  ["member-rewards", "Member & Rewards", ["Tích điểm & Đổi quà"]],
] as const;

const pharmacyNavigationSeed = [
  { id: "pharmacy.registration-login", name: "Đăng ký & Đăng nhập", slug: "registration-login", sequence: 1 },
  { id: "pharmacy.registration-login.registration", parentGroupId: "pharmacy.registration-login", name: "Đăng ký", slug: "registration", sequence: 1 },
  { id: "pharmacy.registration-login.registration.default-flow", parentGroupId: "pharmacy.registration-login.registration", name: "Luồng default", slug: "registration-default-flow", sequence: 1 },
  { id: "pharmacy.registration-login.registration.invalid-cases", parentGroupId: "pharmacy.registration-login.registration", name: "Invalid Cases", slug: "registration-invalid-cases", sequence: 2 },
  { id: "pharmacy.registration-login.registration.otp-sms", parentGroupId: "pharmacy.registration-login.registration", name: "Nhập OTP qua SMS", slug: "registration-otp-sms", sequence: 3 },
  { id: "pharmacy.registration-login.registration.otp-zalo", parentGroupId: "pharmacy.registration-login.registration", name: "Nhận OTP qua Zalo", slug: "registration-otp-zalo", sequence: 4 },
  { id: "pharmacy.registration-login.login", parentGroupId: "pharmacy.registration-login", name: "Đăng nhập", slug: "login", sequence: 2 },
  { id: "pharmacy.registration-login.login.default-flow", parentGroupId: "pharmacy.registration-login.login", name: "Luồng default", slug: "login-default-flow", sequence: 1 },
  { id: "pharmacy.registration-login.login.invalid-cases", parentGroupId: "pharmacy.registration-login.login", name: "Invalid Cases", slug: "login-invalid-cases", sequence: 2 },
  { id: "pharmacy.registration-login.vneid", parentGroupId: "pharmacy.registration-login.login", name: "Đăng nhập qua VNeID", slug: "vneid-login", sequence: 3 },
  { id: "pharmacy.product-search", name: "Tìm kiếm sản phẩm", slug: "product-search", sequence: 2 },
  { id: "pharmacy.product-search.search", parentGroupId: "pharmacy.product-search", name: "Tìm kiếm", slug: "search", sequence: 1, screens: [
    ["enter-keyword", "Nhập từ khóa", ["Default"]],
    ["search-results", "Kết quả tìm kiếm", ["Default"]],
  ] },
  { id: "pharmacy.product-search.filters", parentGroupId: "pharmacy.product-search", name: "Bộ lọc", slug: "filters", sequence: 2, screens: [
    ["use-filters", "Sử dụng bộ lọc", ["Default"]],
    ["search-in-filters", "Tìm kiếm trong bộ lọc", ["Default"]],
  ] },
  { id: "pharmacy.product-search.content", parentGroupId: "pharmacy.product-search", name: "Nội dung", slug: "content", sequence: 3, screens: [
    ["view-article", "Xem bài viết", ["Default"]],
  ] },
  { id: "pharmacy.my-orders", name: "Đơn hàng của tôi", slug: "my-orders", sequence: 3 },
  { id: "pharmacy.my-orders.list-detail", parentGroupId: "pharmacy.my-orders", name: "Danh sách & chi tiết đơn hàng", slug: "list-detail", sequence: 1, screens: [
    ["order-list", "Danh sách đơn hàng", ["Default"]],
    ["order-detail", "Chi tiết đơn hàng", ["Default"]],
    ["order-search", "Tìm kiếm đơn hàng", ["Default"]],
  ] },
  { id: "pharmacy.my-orders.management", parentGroupId: "pharmacy.my-orders", name: "Quản lý đơn hàng", slug: "management", sequence: 2, screens: [
    ["rename-order", "Đổi tên đơn hàng", ["Default"]],
    ["cancel-order", "Hủy đơn hàng", ["Default"]],
    ["reorder", "Mua lại đơn hàng", ["Default"]],
    ["review-order", "Đánh giá đơn hàng", ["Default"]],
  ] },
  { id: "pharmacy.my-orders.repayment", parentGroupId: "pharmacy.my-orders", name: "Thanh toán lại", slug: "repayment", sequence: 3, screens: [
    ["from-order-list", "Từ danh sách đơn hàng", ["Default"]],
    ["from-order-detail", "Từ chi tiết đơn hàng", ["Default"]],
  ] },
  { id: "pharmacy.my-orders.status", parentGroupId: "pharmacy.my-orders", name: "Trạng thái đơn hàng", slug: "order-status", sequence: 4, screens: [
    ["delivered", "Đã giao", ["Default"]],
    ["cancelled", "Đã hủy", ["Default"]],
    ["returned", "Trả hàng", ["Default"]],
  ] },
  { id: "pharmacy.my-orders.notifications", parentGroupId: "pharmacy.my-orders", name: "Thông báo", slug: "notifications", sequence: 5, screens: [
    ["notification-list", "Danh sách thông báo", ["Tất cả", "Khuyến mãi", "Đơn hàng", "Yêu cầu tư vấn", "Mã OTP"]],
    ["notification-detail", "Chi tiết thông báo", ["Default"]],
    ["read-all", "Đọc tất cả", ["Default"]],
    ["delete-notification", "Xóa thông báo", ["Default"]],
  ] },
  { id: "pharmacy.my-orders.account-data", parentGroupId: "pharmacy.my-orders", name: "Tài khoản & dữ liệu cá nhân", slug: "account-data", sequence: 6, screens: [
    ["personal-information", "Thông tin cá nhân", ["Default"]],
    ["qr-code", "Mã QR", ["Default"]],
    ["address-book", "Sổ địa chỉ", ["Default"]],
    ["my-prescriptions", "Đơn thuốc của tôi", ["Default"]],
  ] },
] as const;

export const pharmacyNavigationGroupIds = pharmacyNavigationSeed.map((group) => group.id);

export const businessUnits: BusinessUnit[] = [
  { id: "pharmacy", name: "Nhà thuốc", shortName: "NT", slug: "pharmacy", description: "Design inventory for Pharmacy experiences.", status: "active", groupIds: ["pharmacy.registration-login", ...groupSeed.filter(([slug]) => slug !== "app-entry").map(([slug]) => `pharmacy.${slug}`)] },
  { id: "vaccination", name: "Tiêm chủng", shortName: "TC", slug: "vaccination", description: "Vaccination experiences — coming soon.", status: "coming-soon", groupIds: [] },
  { id: "testing", name: "Xét nghiệm", shortName: "XN", slug: "testing", description: "Testing experiences — coming soon.", status: "coming-soon", groupIds: ["testing.booking"] },
  { id: "mother-baby", name: "Mẹ & Bé", shortName: "MB", slug: "mother-baby", description: "Mother & Baby experiences — coming soon.", status: "coming-soon", groupIds: [] },
];

export const screenGroups: ScreenGroup[] = groupSeed.map(([slug, name, names], index) => ({
  id: `pharmacy.${slug}`,
  name,
  slug,
  sequence: index + 1,
  description: slug === "checkout" ? "Quy trình đặt hàng và thanh toán." : `Các màn hình thuộc nhóm ${name}.`,
  screenIds: names.map((_, i) => slug === "app-entry" ? `pharmacy.app-entry-authentication.${loginSlugs[i]}` : `pharmacy.${slug}.${i + 1}`),
})).filter(group => group.id !== "pharmacy.app-entry");

screenGroups.push(...pharmacyNavigationSeed.map((group) => ({
  id: group.id,
  parentGroupId: "parentGroupId" in group ? group.parentGroupId : null,
  businessUnitId: "pharmacy",
  name: group.name,
  slug: group.slug,
  sequence: group.sequence,
  description: `Cấu trúc điều hướng ${group.name} của Nhà thuốc.`,
  screenIds: "screens" in group ? group.screens.map(([slug]) => `${group.id}.${slug}`) : [],
})));

screenGroups.push({
  id: "testing.booking",
  name: "Đặt lịch",
  slug: "booking",
  sequence: 1,
  description: "Đặt lịch xét nghiệm.",
  screenIds: ["testing.booking.location"],
});

const checkoutSlugs = ["customer-information", "delivery-method", "delivery-address", "payment-method", "order-complete"];
const loginDescriptions = [
  "Màn hình khởi động khi mở ứng dụng Nhà thuốc Long Châu.",
  "Điểm bắt đầu của hành trình đăng nhập Nhà thuốc.",
  "Trạng thái mặc định của biểu mẫu nhập thông tin đăng nhập.",
  "Trạng thái mặc định của bước xác thực mã OTP.",
  "Trang chủ Nhà thuốc dành cho người dùng đã đăng nhập.",
];
const tones = ["blue", "cyan", "navy", "indigo", "emerald", "violet", "amber", "rose"];

export const screens: Screen[] = groupSeed.flatMap(([groupSlug, , names], groupIndex) =>
  names.map((name, index) => {
    const isCheckout = groupSlug === "checkout";
    const isLogin = groupSlug === "app-entry";
    const slug = isCheckout ? checkoutSlugs[index] : isLogin ? loginSlugs[index] : `${groupSlug}-${index + 1}`;
    const id = isLogin ? `pharmacy.app-entry-authentication.${slug}` : `pharmacy.${groupSlug}.${index + 1}`;
    const delivery = slug === "delivery-address";
    return {
      id,
      name,
      slug,
      sequence: index + 1,
      businessUnitId: "pharmacy",
      screenGroupId: isLogin ? "pharmacy.registration-login.login" : `pharmacy.${groupSlug}`,
      description: delivery ? "Quản lý địa chỉ nhận hàng và xác định vị trí giao chính xác." : isLogin ? loginDescriptions[index] : `Màn hình ${name} trong trải nghiệm Nhà thuốc.`,
      whenItAppears: isCheckout ? `Bước ${index + 1} trong quy trình Checkout.` : isLogin ? `Bước ${index + 1} trong luồng Đăng nhập Nhà thuốc.` : `Trong luồng ${groupSeed[groupIndex][1]}.`,
      purpose: delivery ? "Giúp khách hàng chọn hoặc thêm địa chỉ giao hàng đáng tin cậy." : isLogin ? `Minh họa trạng thái ${name} trong hành trình xác thực và vào ứng dụng.` : `Hỗ trợ người dùng hoàn thành tác vụ ${name.toLowerCase()}.`,
      platforms: isLogin ? ["iOS", "Android"] : index % 3 === 2 ? ["iOS", "Android", "Web"] : ["iOS", "Android"],
      previewTone: tones[(groupIndex + index) % tones.length],
      currentVersion: isLogin ? "v1.0" : delivery ? "v3.2" : `v${2 + (index % 2)}.${index + 1}`,
      jiraTicket: delivery ? "LCP-2841" : `LCP-${2100 + groupIndex * 100 + index}`,
      relatedTickets: delivery ? ["LCP-2712", "LCP-2804"] : [`LCP-${2050 + groupIndex * 50 + index}`],
      versions: [
        { id: `${id}.v-current`, label: isLogin ? "v1.0" : delivery ? "v3.2" : `v${2 + (index % 2)}.${index + 1}`, date: isLogin ? "14 Sep 2026" : "28 Aug 2026", note: isLogin ? "Current demo version" : "Current production version" },
        ...(!isLogin ? [{ id: `${id}.v-previous`, label: delivery ? "v3.1" : "v2.0", date: "12 Jun 2026", note: "Previous verified release" }] : []),
      ],
      components: ["App Header", "Primary Button", delivery ? "Address Card" : "Content Card", "Bottom Sheet"].map((component, componentIndex) => ({ id: `${id}.component.${componentIndex}`, name: component })),
      variants: (isLogin ? [] : delivery ? ["Danh sách địa chỉ", "Bản đồ", "Nhập địa chỉ mới", "Địa chỉ công ty", "Địa chỉ nhà", "Vị trí hiện tại"] : ["Mặc định", "Có dữ liệu", "Trống"]).map((variant, variantIndex) => ({ id: `${id}.variant.${variantIndex}`, name: variant, previewTone: tones[(groupIndex + index + variantIndex) % tones.length] })),
      states: (slug === "lc-login-input-default" ? ["Default", "Filled"] : slug === "lc-login-otp-default" ? ["Default", "Default with Suggest", "Filled", "Profile"] : isLogin ? ["Default"] : ["Default", "Loading", "Error"]).map((state, stateIndex) => ({ id: `${id}.state.${state.toLowerCase().replaceAll(" ", "-")}`, name: state, previewTone: tones[(groupIndex + index + stateIndex) % tones.length] })),
      evidence: {
        status: isLogin ? "Unverified" : delivery || index % 2 === 0 ? "Production Verified" : "Internal Verified",
        lastVerified: isLogin ? "Not verified" : "28 Aug 2026",
        source: isLogin ? "Demo library inventory" : delivery ? "Long Châu iOS production app" : "Internal design review",
        verifiedBy: isLogin ? "Not verified" : "Design Ops",
        notes: isLogin ? "Demo content awaiting source verification." : "Checked against the latest approved release.",
      },
      uploadedBy: delivery || isLogin ? "Local User" : undefined,
      lastUpdated: isLogin ? "14 Sep 2026" : delivery ? "08 Sep 2026" : undefined,
      annotations: delivery ? [
        { id: `${id}.annotation.location-picker`, type: "Interaction", title: "Open location picker", description: "Demo rule: opens the location-selection surface while preserving the current checkout context.", x: 82, y: 15, platform: "mobile", variantId: `${id}.variant.0`, trigger: "Select the location entry action.", behavior: "Keep recipient and delivery-method selections unchanged.", component: "Location Picker", isDemo: true, showOnPlaceholder: true },
        { id: `${id}.annotation.address-validation`, type: "Validation", title: "Address validation", description: "Demo rule: validate required address data before the user can continue.", x: 24, y: 48, platform: "mobile", variantId: `${id}.variant.0`, behavior: "Show validation close to the affected field without clearing valid input.", isDemo: true, showOnPlaceholder: true },
        { id: `${id}.annotation.continue-state`, type: "Behavior", title: "Continue button state", description: "Demo rule: enable the primary action only after a valid delivery address is selected.", x: 72, y: 86, platform: "mobile", behavior: "Navigating back preserves the selected recipient and delivery method.", isDemo: true, showOnPlaceholder: true },
      ] : undefined,
      representations: isCheckout || isLogin ? { web: { status: "coming-soon" } } : undefined,
    } satisfies Screen;
  }),
);

screens.push(...pharmacyNavigationSeed.flatMap((group, groupIndex) => "screens" in group ? group.screens.map(([slug, name, stateNames], index) => {
  const id = `${group.id}.${slug}`;
  return {
    id,
    name,
    slug,
    sequence: index + 1,
    businessUnitId: "pharmacy",
    screenGroupId: group.id,
    description: `Màn hình ${name} trong trải nghiệm Nhà thuốc.`,
    whenItAppears: `Trong nhóm ${group.name}.`,
    purpose: `Hỗ trợ người dùng hoàn thành tác vụ ${name.toLowerCase()}.`,
    platforms: ["iOS", "Android"],
    previewTone: tones[(groupIndex + index) % tones.length],
    currentVersion: "v1.0",
    jiraTicket: `LCP-NAV-${groupIndex + 1}${index + 1}`,
    relatedTickets: [],
    versions: [{ id: `${id}.v1`, label: "v1.0", date: "17 Sep 2026", note: "Canonical navigation inventory" }],
    components: [],
    variants: [],
    states: stateNames.map((state, stateIndex) => ({ id: `${id}.state.${stateIndex + 1}`, name: state })),
    evidence: { status: "Unverified", lastVerified: "Not verified", source: "Approved information architecture", verifiedBy: "Not verified", notes: "Canonical navigation record; visual evidence pending." },
  } satisfies Screen;
}): []));

const deliveryAddressScreen = screens.find(screen => screen.slug === "delivery-address");
if (deliveryAddressScreen) {
  // Mock/demo history used only to demonstrate complete snapshot switching in the Viewer.
  deliveryAddressScreen.versionHistory = { mobile: [
    {
      id: "pharmacy.checkout.3.snapshot.v3.2", version: "v3.2", status: "current", createdAt: "08 Sep 2026", lastUpdated: "08 Sep 2026", uploadedBy: "Local User",
      preview: deliveryAddressScreen.preview, description: deliveryAddressScreen.description, whenItAppears: deliveryAddressScreen.whenItAppears, purpose: deliveryAddressScreen.purpose,
      jiraTicket: deliveryAddressScreen.jiraTicket, relatedTickets: deliveryAddressScreen.relatedTickets, figmaHref: deliveryAddressScreen.figmaHref,
      components: deliveryAddressScreen.components, variants: deliveryAddressScreen.variants, states: deliveryAddressScreen.states, annotations: deliveryAddressScreen.annotations ?? [], evidence: deliveryAddressScreen.evidence,
      changelog: ["Demo: refined address-card hierarchy", "Demo: added the current-location state"],
    },
    {
      id: "pharmacy.checkout.3.snapshot.v3.1", version: "v3.1", status: "archived", createdAt: "20 Aug 2026", lastUpdated: "20 Aug 2026", uploadedBy: "Ngọc",
      preview: null, description: "Demo snapshot: legacy address selection before the current location-picker update.", whenItAppears: "Demo snapshot: Checkout step 3 after choosing home delivery.", purpose: "Demo snapshot: select a saved delivery address.",
      jiraTicket: "DEMO-LCP-2712", relatedTickets: ["DEMO-LCP-2680"],
      components: ["App Header", "Legacy Address Card", "Primary Button"].map((name, index) => ({ id: `pharmacy.checkout.3.v31.component.${index}`, name })),
      variants: ["Danh sách địa chỉ cũ", "Thêm địa chỉ"].map((name, index) => ({ id: `pharmacy.checkout.3.v31.variant.${index}`, name })),
      states: [{ id: "pharmacy.checkout.3.v31.state.default", name: "Default" }], annotations: [],
      evidence: { status: "Figma Verified", lastVerified: "18 Aug 2026", verifiedBy: "Local User", source: "Demo internal approved Figma snapshot", notes: "Mock historical evidence for Viewer demonstration." },
      changelog: ["Demo: simplified saved-address selection", "Demo: replaced the earlier address-card pattern"],
    },
    {
      id: "pharmacy.checkout.3.snapshot.v3.0", version: "v3.0", status: "archived", createdAt: "02 Aug 2026", lastUpdated: "02 Aug 2026", uploadedBy: "Trọng",
      preview: null, description: "Demo snapshot: initial archived delivery-address structure.", whenItAppears: "Demo snapshot: early Checkout delivery step.", purpose: "Demo snapshot: capture a delivery destination.",
      relatedTickets: [], components: [{ id: "pharmacy.checkout.3.v30.component.form", name: "Legacy Address Form" }], variants: [], states: [], annotations: [],
      evidence: { status: "Unverified", lastVerified: "Not documented", verifiedBy: "Not documented", source: "Demo library archive", notes: "Mock historical record; not production-verified." },
    },
  ] };
}

screens.push({
  id: "testing.booking.location", name: "Chọn địa điểm lấy mẫu", slug: "sample-location", sequence: 1,
  status: "coming-soon",
  businessUnitId: "testing", screenGroupId: "testing.booking", description: "Chọn địa điểm lấy mẫu xét nghiệm.",
  whenItAppears: "Trong luồng đặt lịch xét nghiệm.", purpose: "Xác định địa điểm lấy mẫu phù hợp.", platforms: ["iOS", "Android"], previewTone: "cyan", currentVersion: "v1.0", jiraTicket: "LCX-102", relatedTickets: [],
  versions: [{ id: "testing.booking.location.v1", label: "v1.0", date: "01 Aug 2026", note: "Initial concept" }],
  components: [{ id: "testing.location.map", name: "Location Picker" }], variants: [{ id: "testing.location.default", name: "Mặc định" }], states: [{ id: "testing.location.loading", name: "Loading" }],
  evidence: { status: "Internal Verified", lastVerified: "01 Aug 2026", source: "Internal prototype", verifiedBy: "Testing Product Team", notes: "Placeholder inventory item." },
});

export const flows: Flow[] = [
  { id: "pharmacy.registration-login.registration.default-flow", name: "Luồng default", slug: "registration-default-flow", description: "Luồng đăng ký mặc định.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.registration-login.registration", parentGroupId: "pharmacy.registration-login.registration", status: "active", screenIds: [] },
  { id: "pharmacy.registration-login.registration.invalid-cases", name: "Invalid Cases", slug: "registration-invalid-cases", description: "Các trường hợp đăng ký không hợp lệ.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.registration-login.registration", parentGroupId: "pharmacy.registration-login.registration", status: "active", screenIds: [] },
  { id: "pharmacy.registration-login.registration.otp-sms", name: "Nhập OTP qua SMS", slug: "registration-otp-sms", description: "Luồng xác thực OTP qua SMS.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.registration-login.registration", parentGroupId: "pharmacy.registration-login.registration", status: "active", screenIds: [] },
  { id: "pharmacy.registration-login.registration.otp-zalo", name: "Nhận OTP qua Zalo", slug: "registration-otp-zalo", description: "Luồng nhận OTP qua Zalo.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.registration-login.registration", parentGroupId: "pharmacy.registration-login.registration", status: "active", screenIds: [] },
  { id: "pharmacy.registration-login.login.default-flow", name: "Luồng default", slug: "login-default-flow", description: "Luồng đăng nhập mặc định.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.registration-login.login", parentGroupId: "pharmacy.registration-login.login", status: "active", screenIds: [] },
  { id: "pharmacy.registration-login.login.invalid-cases", name: "Invalid Cases", slug: "login-invalid-cases", description: "Các trường hợp đăng nhập không hợp lệ.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.registration-login.login", parentGroupId: "pharmacy.registration-login.login", status: "active", screenIds: [] },
  { id: "pharmacy.registration-login.vneid", name: "Đăng nhập qua VNeID", slug: "vneid-login", description: "Luồng đăng nhập qua VNeID.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.registration-login.login", parentGroupId: "pharmacy.registration-login.login", status: "active", screenIds: [] },
  { id: "pharmacy.checkout", name: "Checkout", slug: "checkout", description: "Quy trình đặt hàng và thanh toán.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.checkout", status: "active", screenIds: checkoutSlugs.map((_, index) => `pharmacy.checkout.${index + 1}`) },
  { id: "pharmacy.authentication", name: "Đăng nhập Nhà thuốc", slug: "dang-nhap-nha-thuoc", description: "Hành trình từ khởi động ứng dụng đến trang chủ sau khi đăng nhập.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.registration-login.login", parentGroupId: "pharmacy.registration-login.login", status: "active", screenIds: loginSlugs.map((slug) => `pharmacy.app-entry-authentication.${slug}`) },
  { id: "pharmacy.medicine-reminder", name: "Nhắc uống thuốc", slug: "medicine-reminder", description: "Luồng tạo và quản lý lịch nhắc uống thuốc.", businessUnitId: "pharmacy", screenGroupId: "pharmacy.medicine-reminder", status: "coming-soon", screenIds: screenGroups.find((group) => group.id === "pharmacy.medicine-reminder")?.screenIds ?? [] },
];
