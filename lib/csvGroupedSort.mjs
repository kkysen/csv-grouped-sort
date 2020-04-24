import {promises as fs} from "fs";

function comparing(f, ascending) {
    const k = ascending ? 1 : -1;
    return (a, b) => k * (f(a) - f(b));
}

function plainCsvToRows(csv) {
    return csv
        .replace("\r", "")
        .split("\n")
        .map(line => line.split(","));
}

function csvToRows(csv) {
    const rows = [];
    let row = [];
    let field = "";
    
    function endField() {
        row.push(field);
        field = "";
    }
    
    function endRow() {
        endField();
        rows.push(row);
        row = [];
    }
    
    let quoted = false;
    for (let i = 0; i < csv.length; i++) {
        const c = csv[i];
        if (quoted) {
            if (c === `"`) {
                quoted = false;
            } else {
                field += c;
            }
        } else {
            switch (c) {
                case `,`:
                    endField();
                    break;
                case `\n`:
                    endRow();
                    break;
                case `\r`:
                    break;
                case `"`:
                    quoted = true;
                    break;
                default:
                    field += c;
                    break;
            }
        }
    }
    endRow();
    return rows;
}

function quoteFields(rows) {
    return rows.map(row => row.map(field => {
        if (field.includes(`,`) || field.includes(`\n`)) {
            return `"${field}"`;
        } else {
            return field;
        }
    }));
}

function plainRowsToCsv(rows) {
    return rows
        .map(row => row.join(","))
        .join("\n");
}

function rowsToCsv(rows) {
    return plainRowsToCsv(quoteFields(rows));
}

export function sortCsvRowsByGroup(
    {
        rows: allRows,
        numHeadersToSkip,
        getGroupField,
        getSortField,
        sortBy,
        ascending,
        transformGroup = () => {},
    }) {
    const skippedRows = allRows.slice(0, numHeadersToSkip);
    const [headers, ...rows] = allRows.slice(numHeadersToSkip);
    const groups = new Map();
    for (const row of rows) {
        const rowObj = (() => {
            const obj = {};
            for (let i = 0; i < row.length; i++) {
                obj[headers[i]] = row[i];
            }
            return obj;
        })();
        const groupField = getGroupField(rowObj);
        const sortField = getSortField(rowObj);
        const group = groups.get(groupField);
        const entry = {
            groupField,
            sortField,
            row,
        };
        if (group === undefined) {
            groups.set(groupField, [entry]);
        } else {
            group.push(entry);
        }
    }
    const sortedRows = [...groups.values()]
        .map(group => ({
            group,
            sortValue: sortBy(group.map(e => e.sortField)),
        }))
        .sort(comparing(e => e.sortValue, ascending))
        .flatMap(e => transformGroup(e.group))
        .map(e => e.row);
    return [...skippedRows, headers, ...sortedRows];
}

export async function sortCsvByGroup(
    {
        paths,
        numHeadersToSkip,
        getGroupField,
        getSortField,
        sortBy,
        ascending,
        transformGroup = () => {},
    }) {
    const inputCsv = await fs.readFile(paths.input, "utf-8");
    const inputRows = csvToRows(inputCsv);
    const outputRows = sortCsvRowsByGroup({
        rows: inputRows,
        numHeadersToSkip,
        getGroupField,
        getSortField,
        sortBy,
        ascending,
        transformGroup,
    });
    const outputCsv = rowsToCsv(outputRows);
    await fs.writeFile(paths.output, outputCsv);
}