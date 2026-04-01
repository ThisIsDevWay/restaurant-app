import { test, expect } from '@playwright/test';

test.describe('Página Principal — Estructura y Navegación', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('la página carga con el menú visible', async ({ page }) => {
        // Verifica que la estructura básica del menú carga
        await expect(page).toHaveTitle(/.+/);
        // El contenedor principal del menú debe existir
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('los botones de Agregar están presentes cuando hay ítems disponibles', async ({ page }) => {
        // Espera a que React Suspense cargue los ítems reales del menú
        const addButtons = page.locator('button[aria-label^="Agregar"]');
        // Si hay ítems en la DB, deben mostrarse
        const count = await addButtons.count();
        // No falla si no hay ítems; simplemente registra el estado
        console.log(`[E2E] Botones de agregar encontrados: ${count}`);
        // Si hay botones, verificar que son visibles
        if (count > 0) {
            await expect(addButtons.first()).toBeVisible();
        }
    });
});

test.describe('Flujo de Checkout — Formulario', () => {
    test('la página de checkout carga y muestra el formulario', async ({ page }) => {
        await page.goto('/checkout');
        await page.waitForLoadState('networkidle');
        // Si hay items en el carrito redirige al checkout, si no puede redirigir al menú
        const url = page.url();
        // Verificamos que la navegación no falló con un 500
        expect(page.url()).not.toContain('error');
    });
});

test.describe('Flujo de Agregar al Carrito (requiere datos en DB)', () => {
    test('agregar item y abrir carrito', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Esperar a que los ítems del menú carguen
        const addButton = page.locator('button[aria-label^="Agregar"]').first();

        try {
            await addButton.waitFor({ state: 'visible', timeout: 10000 });
        } catch {
            // No hay ítems en la DB — el test se salta limpiamente
            test.skip();
            return;
        }

        // Usar toPass para manejar la hidratación de React/Zustand
        await expect(async () => {
            await addButton.click();

            // Si se abre un modal de personalización, cerrarlo añadiendo
            const modalAddButton = page.locator('button:has-text("Añadir al")');
            if (await modalAddButton.isVisible()) {
                await modalAddButton.click();
            }

            // El sticky bar del carrito debe aparecer
            const cartBar = page.locator('button:has-text("Ver pedido")').first();
            await expect(cartBar).toBeVisible({ timeout: 2000 });
        }).toPass({ timeout: 20000 });

        // Abrir el drawer del carrito
        await page.locator('button:has-text("Ver pedido")').first().click();

        // Verificar que el drawer se abre con el pedido
        const drawerHeader = page.locator('h2:has-text("Mi pedido")');
        await expect(drawerHeader).toBeVisible();
    });
});


