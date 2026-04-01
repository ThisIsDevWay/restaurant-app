import {
    menuItems,
    categories,
    orders,
    customers,
    dailyMenuItems,
    dailyAdicionales,
    dailyBebidas,
    dailyContornos,
    whatsappTemplates,
    settings,
} from "@/db/schema";

// Menu & Categories
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

// Orders & Customers
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

// Daily Menu
export type DailyMenuItem = typeof dailyMenuItems.$inferSelect;
export type DailyAdicional = typeof dailyAdicionales.$inferSelect;
export type DailyBebida = typeof dailyBebidas.$inferSelect;
export type DailyContorno = typeof dailyContornos.$inferSelect;

// Admin & System
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type SystemSettings = typeof settings.$inferSelect;
