package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
	"unsafe"

	"github.com/joho/godotenv"
)

// --- Estructuras de Datos ---

type PrintJob struct {
	ID         string `json:"id"`
	OrderID    string `json:"order_id"`
	RawContent string `json:"raw_content"`
	Copies     int    `json:"copies"`
	Status     string `json:"status"`
}

// --- Win32 Spooler API (winspool.drv) ---

var (
	winspool         = syscall.NewLazyDLL("winspool.drv")
	procOpenPrinter   = winspool.NewProc("OpenPrinterW")
	procStartDocPrinter = winspool.NewProc("StartDocPrinterW")
	procStartPagePrinter = winspool.NewProc("StartPagePrinter")
	procWritePrinter  = winspool.NewProc("WritePrinter")
	procEndPagePrinter = winspool.NewProc("EndPagePrinter")
	procEndDocPrinter   = winspool.NewProc("EndDocPrinter")
	procClosePrinter  = winspool.NewProc("ClosePrinter")
)

type DOC_INFO_1 struct {
	DocName    *uint16
	OutputFile *uint16
	Datatype   *uint16
}

func PrintRaw(printerName string, content string, copies int) error {
	var hPrinter syscall.Handle
	pPrinterName, _ := syscall.UTF16PtrFromString(printerName)
	
	// 1. Abrir Impresora
	ret, _, err := procOpenPrinter.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		uintptr(unsafe.Pointer(&hPrinter)),
		0,
	)
	if ret == 0 {
		return fmt.Errorf("no se pudo abrir la impresora %s: %v", printerName, err)
	}
	defer procClosePrinter.Call(uintptr(hPrinter))

	// --- Comandos ESC/POS ---
	escInit := []byte{0x1B, 0x40}             // ESC @ = Inicializar impresora (resetea ancho, fuente, etc.)
	feedAndCut := []byte{                      // Avanzar papel + Corte parcial
		0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x0A,  // 6 líneas de avance para que el ticket salga completo
		0x1D, 0x56, 0x41, 0x03,               // GS V 65 3 = Corte parcial (deja una pestaña)
	}

	for i := 1; i <= copies; i++ {
		fmt.Printf("  [Print] Enviando copia %d de %d...\n", i, copies)

		docName, _ := syscall.UTF16PtrFromString("Ticket GM App")
		dataType, _ := syscall.UTF16PtrFromString("RAW")
		di := DOC_INFO_1{
			DocName:  docName,
			Datatype: dataType,
		}

		// 1. Iniciar Documento
		ret, _, _ = procStartDocPrinter.Call(
			uintptr(hPrinter),
			1,
			uintptr(unsafe.Pointer(&di)),
		)
		if ret == 0 {
			return fmt.Errorf("error en StartDocPrinter")
		}

		// 2. Iniciar Página
		procStartPagePrinter.Call(uintptr(hPrinter))

		// 3. Construir el payload completo: INIT + CONTENIDO + AVANCE + CORTE
		contentBytes := []byte(content)
		payload := make([]byte, 0, len(escInit)+len(contentBytes)+len(feedAndCut))
		payload = append(payload, escInit...)      // Resetear impresora (ancho completo)
		payload = append(payload, contentBytes...)  // Contenido del ticket
		payload = append(payload, feedAndCut...)    // Avanzar papel y cortar

		// 4. Enviar todo de un solo golpe al spooler
		var written uint32
		procWritePrinter.Call(
			uintptr(hPrinter),
			uintptr(unsafe.Pointer(&payload[0])),
			uintptr(len(payload)),
			uintptr(unsafe.Pointer(&written)),
		)
		fmt.Printf("  [Print] Enviados %d bytes a la impresora.\n", written)

		// 5. Finalizar
		procEndPagePrinter.Call(uintptr(hPrinter))
		procEndDocPrinter.Call(uintptr(hPrinter))
	}

	return nil
}

// --- Lógica del Agente ---

func main() {
	godotenv.Load()

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")
	
	printerName := os.Getenv("PRINTER_NAME")
	if printerName == "" {
		printerName = "POS-80"
	}

	agentTarget := os.Getenv("AGENT_TARGET")
	if agentTarget == "" {
		agentTarget = "main"
	}

	intervalStr := os.Getenv("POLLING_INTERVAL_MS")
	
	interval, _ := strconv.Atoi(intervalStr)
	if interval == 0 { interval = 5000 }
	pollDuration := time.Duration(interval) * time.Millisecond

	fmt.Printf("\n=========================================\n")
	fmt.Printf("   🐹 GM App Print Agent - Go V1\n")
	fmt.Printf("=========================================\n")
	fmt.Printf("📡 URL:     %s\n", supabaseURL)
	fmt.Printf("🖨️ Printer: %s\n", printerName)
	fmt.Printf("🎯 Target:  %s\n", agentTarget)
	fmt.Printf("=========================================\n\n")

	if supabaseURL == "" || supabaseKey == "" {
		fmt.Println("❌ Error: Faltan variables en .env")
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}

	// Manejo de salida graciosa
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	go func(){
		<-c
		fmt.Println("\n[System] Deteniendo agente...")
		os.Exit(0)
	}()

	fmt.Println("[System] Iniciando monitoreo...")

	for {
		url := supabaseURL + "/rest/v1/print_jobs?status=eq.pending&target=eq." + agentTarget + "&order=created_at.asc"
		
		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("apikey", supabaseKey)
		req.Header.Set("Authorization", "Bearer "+supabaseKey)

		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("⚠️ Error de conexión: %v\n", err)
			time.Sleep(pollDuration)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			fmt.Printf("⚠️ Error de Supabase (Status %d): %s\n", resp.StatusCode, string(body))
			resp.Body.Close()
			time.Sleep(pollDuration)
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		// DEBUG temporal: Imprimir el body crudo si está vacío o pasa algo raro
		if len(body) <= 2 { // Si es "[]"
			// fmt.Printf("DEBUG - Body vacío: %s\n", string(body))
		}

		var jobs []PrintJob
		err = json.Unmarshal(body, &jobs)
		if err != nil {
			fmt.Printf("⚠️ Error al procesar JSON: %v. Body: %s\n", err, string(body))
			time.Sleep(pollDuration)
			continue
		}

		if len(jobs) > 0 {
			fmt.Printf("[%s] Encontrados %d trabajos.\n", time.Now().Format("15:04:05"), len(jobs))
			for _, job := range jobs {
				fmt.Printf("  > Procesando Job %s...\n", job.ID)

				// Marcar como 'printing'
				updateStatus(client, supabaseURL, supabaseKey, job.ID, "printing")

				// Imprimir
				err := PrintRaw(printerName, job.RawContent, job.Copies)
				if err == nil {
					updateStatus(client, supabaseURL, supabaseKey, job.ID, "printed")
					fmt.Println("    ✅ Completado.")
				} else {
					updateStatus(client, supabaseURL, supabaseKey, job.ID, "failed")
					fmt.Printf("    ❌ Falló: %v\n", err)
				}
			}
		}

		time.Sleep(pollDuration)
	}
}

func updateStatus(client *http.Client, url, key, id, status string) {
	updateURL := url + "/rest/v1/print_jobs?id=eq." + id
	payload, _ := json.Marshal(map[string]string{"status": status})
	
	req, _ := http.NewRequest("PATCH", updateURL, bytes.NewBuffer(payload))
	req.Header.Set("apikey", key)
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err == nil {
		resp.Body.Close()
	}
}
