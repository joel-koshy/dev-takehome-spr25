import { describe, it, expect, beforeEach } from "vitest";
import { MockItemRequest } from "@/lib/types/mock/request";
import { RequestStatus } from "@/lib/types/request";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { getItemRequests, createItemRequest } from "./requests";
import mockItemRequests from "@/app/api/mock/data";
import { InvalidInputError, InvalidPaginationError } from "@/lib/errors/inputExceptions";
import clientPromise, { getCollection } from "@/lib/db/mongodb";
import { ItemRequest } from "@/lib/types/requests/requests";
import { ObjectId } from "mongodb";

const mockData:ItemRequest[] = mockItemRequests.map((mock) => {
    const newId = new ObjectId() 
    return(
        {
        _id: newId, //To match DB and local 
        id: newId,

        requestorName: mock.requestorName,
        itemRequested: mock.itemRequested,
        requestCreatedDate: new Date(mock.requestCreatedDate),
        lastEditedDate: mock.lastEditedDate ? new Date(mock.lastEditedDate) : null,
        status: mock.status,
        }
    )
})


async function clearDB() {
    const col = await getCollection("test");
    await col.deleteMany({});
}

async function setUpDB(data: ItemRequest[] = mockData) {
    clearDB()
    const col = await getCollection("test");
    await col.insertMany(data);
}

const getSortedMockData = () =>
    [...mockData].sort((a, b) => {
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
            expect(result[0].id).toStrictEqual(sortedData[0].id); // Should be ID 10
            expect(result[PAGINATION_PAGE_SIZE - 1].id).toStrictEqual(
                sortedData[PAGINATION_PAGE_SIZE - 1].id
            ); // Should be ID 6
        });

        it("should return the second page of all requests, sorted by newest date", async () => {
            const result = await getItemRequests(null, 2, "test");
            const sortedData = getSortedMockData();

            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toStrictEqual(sortedData[PAGINATION_PAGE_SIZE].id); // Should be ID 5
            expect(result[PAGINATION_PAGE_SIZE - 1].id).toStrictEqual(
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
            expect(result[0].id).toStrictEqual(approvedRequests[0].id); // ID 10
            expect(result[2].id).toStrictEqual(approvedRequests[2].id); // ID 2
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
            expect(result[0].id).toStrictEqual(pendingRequests[0].id); // ID 9
        });
    });

    // Test case 3: Filtering by an invalid status
    describe("when filtering by an invalid status", () => {
        it("should ignore the filter and return the first page of all requests", async () => {
            const result = await getItemRequests("invalid-status", 1, "test");
            const sortedData = getSortedMockData();

            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toStrictEqual(sortedData[0].id); // ID 10
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
        const localMockData: ItemRequest[] = [
            {
                id: new ObjectId(),
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

describe('createItemRequest', () => {

  // Reset the database before each test to ensure a clean state
  beforeEach(async () => {
    await clearDB();
  });

  // Test case group for successful creation
  describe('when given valid data', () => {
    it('should create a new item request and add it to the database', async () => {
      const newItemData = {
        requestorName: 'John Doe',
        itemRequested: 'A new standing desk',
        status: RequestStatus.APPROVED,
      };

      await createItemRequest(newItemData, "test");
      
      const col = await getCollection("test");
      const count = await col.countDocuments();
      const insertedItem = await col.findOne({ requestorName: 'John Doe' });

      // Expect the total count to increase by 1
      expect(count).toBe(mockItemRequests.length + 1);
      
      // Expect the inserted item to exist and have the correct data
      expect(insertedItem).not.toBeNull();
      expect(insertedItem?.itemRequested).toBe('A new standing desk');
      expect(insertedItem?.status).toBe(RequestStatus.APPROVED);
    });

    it('should default to a "pending" status if no status is provided', async () => {
      const newItemData = {
        requestorName: 'Jane Smith',
        itemRequested: 'Ergonomic keyboard',
      };

      await createItemRequest(newItemData, "test");

      const col = await getCollection("test");
      const insertedItem = await col.findOne({ requestorName: 'Jane Smith' });

      expect(insertedItem).not.toBeNull();
      expect(insertedItem?.status).toBe(RequestStatus.PENDING);
    });
  });

  // Test case group for invalid input and error handling
  describe('when given invalid data', () => {
    it('should throw InvalidInputError if requestorName is missing', async () => {
      const invalidData = { itemRequested: 'An item' };
      await expect(createItemRequest(invalidData, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError if itemRequested is missing', async () => {
      const invalidData = { requestorName: 'Missing Item' };
      await expect(createItemRequest(invalidData, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError if requestorName is too short', async () => {
      const invalidData = { requestorName: 'Bo', itemRequested: 'A valid item' };
      await expect(createItemRequest(invalidData, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError if requestorName is too long', async () => {
      const longName = 'a'.repeat(31);
      const invalidData = { requestorName: longName, itemRequested: 'A valid item' };
      await expect(createItemRequest(invalidData, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError if itemRequested is too short', async () => {
      const invalidData = { requestorName: 'Valid Name', itemRequested: 'A' };
      await expect(createItemRequest(invalidData, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError if itemRequested is too long', async () => {
      const longItem = 'a'.repeat(101);
      const invalidData = { requestorName: 'Valid Name', itemRequested: longItem };
      await expect(createItemRequest(invalidData, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError if an invalid status is provided', async () => {
      const invalidData = { 
        requestorName: 'Status Test', 
        itemRequested: 'A valid item',
        status: 'on-hold' // Not a valid RequestStatus
      };
      await expect(createItemRequest(invalidData, "test")).rejects.toThrow(InvalidInputError);
    });
  });
});