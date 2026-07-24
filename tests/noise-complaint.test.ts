import { describe, expect, it } from "vitest";
import { parseNoiseComplaintGrid } from "@/lib/collection/adapters/noise-complaint";

describe("noise complaint statistics", () => {
  it("extracts district-level noise complaint totals from the official grid", () => {
    const grid = `
      <table><tbody>
        <tr>
          <td class="merge" title="합계"></td><td class="first" title="종로구"></td>
          <td class="value" title="3,764"></td><td class="value" title="3,384"></td>
          <td class="value" title="-"></td><td class="value" title="-"></td><td class="value" title="3,384"></td>
        </tr>
        <tr>
          <td class="merge" title="합계"></td><td class="first" title="구로구"></td>
          <td class="value" title="1,256"></td><td class="value" title="1,064"></td>
          <td class="value" title="-"></td><td class="value" title="26"></td><td class="value" title="1,038"></td>
        </tr>
      </tbody></table>`;
    expect(parseNoiseComplaintGrid(grid)).toEqual([
      { districtName: "종로구", value: 3384 },
      { districtName: "구로구", value: 1064 },
    ]);
  });
});
