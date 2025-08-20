import { describe, it, expect } from "vitest";
import { MockItemRequest } from "@/lib/types/mock/request";
import { RequestStatus } from "@/lib/types/request";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { getItemRequests, createItemRequest } from "./requests";
import mockItemRequests from "@/app/api/mock/data";
import { InvalidPaginationError } from "@/lib/errors/inputExceptions";
import clientPromise, { getCollection } from "@/lib/db/mongodb";

async function setUpDB(data: MockItemRequest[] = mockItemRequests) {
    const col = await getCollection("test");
    await col.deleteMany({});
    await col.insertMany(data);
}

const getSortedMockData = () =>
    [...mockItemRequests].sort((a, b) => {
        const dateDiff =
            b.requestCreatedDate.getTime() - a.requestCreatedDate.getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.requestorName.localeCompare(b.requestorName);
    });

// --- Test Suite ---
describe("getItemRequests", async () => {
    //Clear and upload mock data to the test

    // Helper to sort mock data for predictable test results, newest first
    await setUpDB();

    // Test case 1: No status filter (all items)
    describe("when no status filter is applied", () => {
        it("should return the first page of all requests, sorted by newest date", async () => {
            const result = await getItemRequests(null, 1, "test");
            const sortedData = getSortedMockData();
            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toBe(sortedData[0].id); // Should be ID 10
            expect(result[PAGINATION_PAGE_SIZE - 1].id).toBe(
                sortedData[PAGINATION_PAGE_SIZE - 1].id
            ); // Should be ID 6
        });

        it("should return the second page of all requests, sorted by newest date", async () => {
            const result = await getItemRequests(null, 2, "test");
            const sortedData = getSortedMockData();

            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toBe(sortedData[PAGINATION_PAGE_SIZE].id); // Should be ID 5
            expect(result[PAGINATION_PAGE_SIZE - 1].id).toBe(
                sortedData[2 * PAGINATION_PAGE_SIZE - 1].id
            ); // Should be ID 1
        });

        it("should return an empty array for a page that is out of bounds", async () => {
            const outOfBoundsPage = mockItemRequests.length;
            const result = await getItemRequests(null, outOfBoundsPage, "test");
            expect(result).toHaveLength(0);
        });
    });

    // Test case 2: Filtering by a valid status
    describe("when filtering by a valid status", () => {
        it('should return the first page of "approved" requests, sorted by newest date', async () => {
            const result = await getItemRequests(
                RequestStatus.APPROVED,
                1,
                "test"
            );
            const approvedRequests = getSortedMockData().filter(
                (r) => r.status === RequestStatus.APPROVED
            );

            expect(result).toHaveLength(4); // There are 3 approved requests
            expect(
                result.every((r) => r.status === RequestStatus.APPROVED)
            ).toBe(true);
            expect(result[0].id).toBe(approvedRequests[0].id); // ID 10
            expect(result[2].id).toBe(approvedRequests[2].id); // ID 2
        });

        it('should return an empty array for the second page of "approved" requests', async () => {
            const result = await getItemRequests(
                RequestStatus.APPROVED,
                2,
                "test"
            );
            expect(result).toHaveLength(0);
        });

        it('should return the first page of "pending" requests, sorted by newest date', async () => {
            const result = await getItemRequests(
                RequestStatus.PENDING,
                1,
                "test"
            );
            const pendingRequests = getSortedMockData().filter(
                (r) => r.status === RequestStatus.PENDING
            );
            expect(result).toHaveLength(5);
            expect(
                result.every((r) => r.status === RequestStatus.PENDING)
            ).toBe(true);
            expect(result[0].id).toBe(pendingRequests[0].id); // ID 9
        });
    });

    // Test case 3: Filtering by an invalid status
    describe("when filtering by an invalid status", () => {
        it("should ignore the filter and return the first page of all requests", async () => {
            const result = await getItemRequests("invalid-status", 1, "test");
            const sortedData = getSortedMockData();

            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toBe(sortedData[0].id); // ID 10
        });
    });

    // Test case 4: Handling invalid page numbers
    describe("when an invalid page number is provided", () => {
        it("should throw InvalidPaginationError for page 0", async () => {
            await expect(() =>
                getItemRequests(null, 0, "test")
            ).rejects.toThrow(InvalidPaginationError);
        });

        it("should throw InvalidPaginationError for a negative page number", async () => {
            await expect(() =>
                getItemRequests(RequestStatus.APPROVED, -1, "test")
            ).rejects.toThrow(InvalidPaginationError);
        });
    });

    describe("when filtering for a status with no matching items", () => {
        const localMockData: MockItemRequest[] = [
            {
                id: 1,
                requestorName: "Alice",
                itemRequested: "Laptop",
                requestCreatedDate: new Date("2023-01-01T10:00:00Z"),
                lastEditedDate: null,
                status: RequestStatus.PENDING,
            },
        ];

        it("should return an empty array", async () => {
            setUpDB(localMockData);

            const result = await getItemRequests(
                RequestStatus.APPROVED,
                1,
                "test"
            );
            expect(result).toHaveLength(0);

            mockItemRequests.length = 0;
        });
    });
});


