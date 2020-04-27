#! /usr/bin/env node

import * as path from "path";
import {sortCsvByGroup} from "../lib/csvGroupedSort.mjs";

async function handelSort(
    {
        paths,
        options: {
            numHeadersToSkip,
            nameFields,
            floatSortField,
            sortBy,
            ascending,
            separateGroupsWithBlankLine,
        },
    }) {
    await sortCsvByGroup({
        paths,
        numHeadersToSkip,
        getGroupField: row => nameFields.map(field => row[field]).join(" "),
        getSortField: row => parseFloat(row[floatSortField]),
        sortBy: sortValues => {
            const values = sortValues.filter(Boolean);
            return values.length === 0 ? 0 : sortBy(...values);
        },
        ascending,
        transformGroup: ({group, sortValue}) => {
            const fieldName = "Sort Value";
            const isHeader = sortValue === null;
            if (isHeader) {
                sortValue = fieldName;
            }
            for (const {row, rowObj} of group) {
                const i = Object.keys(rowObj).indexOf(floatSortField);
                const value = sortValue.toString();
                rowObj[fieldName] = value;
                row.splice(i + 1, 0, value);
            }
            return (separateGroupsWithBlankLine && !isHeader) ? [{row: []}, ...group] : group;
        },
    });
}

function average(...values) {
    return values.reduce((a, b) => a + b) / values.length;
}

async function main() {
    const [_node, script, inputFile, outputFile, sortBy] = process.argv;
    const paths = [inputFile, outputFile];
    const sorts = {
        min: Math.min,
        minimum: Math.min,
        max: Math.max,
        maximum: Math.max,
        avg: average,
        average: average,
    };
    if (paths.includes(undefined)) {
        const scriptName = path.basename(script);
        console.error(`usage: ${scriptName} <inputFile.csv> <outputFile.csv> <sortBy>`);
        return;
    }
    const options = {
        numHeadersToSkip: 1,
        nameFields: ["First Name", "Last Name"],
        floatSortField: "Total Average Score",
        sortBy: sorts[sortBy] ?? (() => {throw new Error(`sortBy must be in ${Object.keys(sorts)}`);})(),
        ascending: false,
        separateGroupsWithBlankLine: true,
    };
    await handelSort({
        paths: {
            input: inputFile,
            output: outputFile,
        },
        options,
    });
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
