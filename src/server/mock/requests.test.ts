import { describe, it, expect } from "vitest";
import { MockItemRequest } from "@/lib/types/mock/request";
import { RequestStatus } from "@/lib/types/request";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { getMockItemRequests } from "./requests";
import mockItemRequests from "@/app/api/mock/data";
import { InvalidPaginationError } from "@/lib/errors/inputExceptions";

// --- Test Suite ---
describe("getMockItemRequests", () => {
    // Helper to sort mock data for predictable test results, newest first
    const getSortedMockData = () =>
        [...mockItemRequests].sort(
            (a, b) =>
                b.requestCreatedDate.getTime() - a.requestCreatedDate.getTime()
        );

    // Test case 1: No status filter (all items)
    describe("when no status filter is applied", () => {
        it("should return the first page of all requests, sorted by newest date", () => {
            const result = getMockItemRequests(null, 1);
            const sortedData = getSortedMockData();

            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toBe(sortedData[0].id); // Should be ID 10
            expect(result[PAGINATION_PAGE_SIZE - 1].id).toBe(
                sortedData[PAGINATION_PAGE_SIZE - 1].id
            ); // Should be ID 6
        });

        it("should return the second page of all requests, sorted by newest date", () => {
            const result = getMockItemRequests(null, 2);
            const sortedData = getSortedMockData();

            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toBe(sortedData[PAGINATION_PAGE_SIZE].id); // Should be ID 5
            expect(result[PAGINATION_PAGE_SIZE - 1].id).toBe(
                sortedData[2 * PAGINATION_PAGE_SIZE - 1].id
            ); // Should be ID 1
        });

        it("should return an empty array for a page that is out of bounds", () => {
            const outOfBoundsPage = mockItemRequests.length;
            const result = getMockItemRequests(null, outOfBoundsPage);
            expect(result).toHaveLength(0);
        });
    });

    // Test case 2: Filtering by a valid status
    describe("when filtering by a valid status", () => {
        it('should return the first page of "approved" requests, sorted by newest date', () => {
            const result = getMockItemRequests(RequestStatus.APPROVED, 1);
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

        it('should return an empty array for the second page of "approved" requests', () => {
            const result = getMockItemRequests(RequestStatus.APPROVED, 2);
            expect(result).toHaveLength(0);
        });

        it('should return the first page of "pending" requests, sorted by newest date', () => {
            const result = getMockItemRequests(RequestStatus.PENDING, 1);
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
        it("should ignore the filter and return the first page of all requests", () => {
            const result = getMockItemRequests("invalid-status", 1);
            const sortedData = getSortedMockData();

            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toBe(sortedData[0].id); // ID 10
        });
    });

    // Test case 4: Handling invalid page numbers
    describe("when an invalid page number is provided", () => {
        it("should throw InvalidPaginationError for page 0", () => {
            expect(() => getMockItemRequests(null, 0)).toThrow(
                InvalidPaginationError
            );
        });

        it("should throw InvalidPaginationError for a negative page number", () => {
            expect(() =>
                getMockItemRequests(RequestStatus.APPROVED, -1)
            ).toThrow(InvalidPaginationError);
        });
    });

    //   // Test case 5: Edge case with no matching items
    //   describe('when filtering for a status with no matching items', () => {
    //     // This test case temporarily modifies the imported mock data.
    //     // For more complex scenarios, consider using vi.mock to avoid side effects.
    //     const localMockData: MockItemRequest[] = [{ id: 1, requestorName: 'Alice', itemRequested: 'Laptop', requestCreatedDate: new Date('2023-01-01T10:00:00Z'), lastEditedDate: null, status: RequestStatus.PENDING }];

    //     it('should return an empty array', () => {
    //         // We need to mock the global data for this specific test
    //         const originalData = [...mockItemRequests];
    //         mockItemRequests.length = 0; // Clear the array
    //         mockItemRequests.push(...localMockData);

    //         const result = getMockItemRequests(RequestStatus.APPROVED, 1);
    //         expect(result).toHaveLength(0);

    //         // Restore original data
    //         mockItemRequests.length = 0;
    //         mockItemRequests.push(...originalData);
    //     });
    //   });
});
