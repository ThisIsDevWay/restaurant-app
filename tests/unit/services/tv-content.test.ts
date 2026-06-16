import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateDisplayHeartbeat } from "@/lib/services/tv-content";
import { db } from "@/db";
import { tvDisplays } from "@/db/schema";
import { SQL } from "drizzle-orm";

vi.mock("@/db", () => {
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockWhere = vi.fn();

  mockUpdate.mockReturnValue({
    set: mockSet.mockReturnValue({
      where: mockWhere.mockResolvedValue(undefined),
    }),
  });

  return {
    db: {
      update: mockUpdate,
    },
  };
});

describe("updateDisplayHeartbeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update display heartbeat with orientations and sizes", async () => {
    const mockSet = vi.mocked(db.update(tvDisplays).set);

    await updateDisplayHeartbeat({
      displayId: "display-123",
      reportedOrientation: "portrait-primary",
      reportedSize: "1080x1920",
    });

    expect(db.update).toHaveBeenCalledWith(tvDisplays);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        lastReportedOrientation: "portrait-primary",
        lastReportedSize: "1080x1920",
      })
    );
    
    // Retrieve the where mock from the return value of the set call
    const mockWhere = mockSet.mock.results[0].value.where;

    expect(mockSet.mock.calls[0][0].lastSeenAt).toBeInstanceOf(SQL);
    expect(mockWhere).toHaveBeenCalledOnce();
  });

  it("should fallback to nulls for reported parameters when not provided", async () => {
    const mockSet = vi.mocked(db.update(tvDisplays).set);

    await updateDisplayHeartbeat({
      displayId: "display-123",
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        lastReportedOrientation: null,
        lastReportedSize: null,
      })
    );
  });
});
