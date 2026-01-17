
import { parse } from 'csv-parse/sync';

const csvContent = `CRN,Course Code,Course Title,Teaching Method,Instructor,Building,Day,Time,Room,Capacity,Enrolled,Reservation,Major Restriction,Prerequisites,Credit/Class Resc.
30534,BLG 212,Mikroişlemci Sistemleri,-,Tamer Ölmez,"EEB<br>EEB","Çarşamba<br>Çarşamba","09:30/12:29<br>13:30/16:29",-,35,29,-,"EHB, ELE, ELK, TEL",BLG 231 MIN DD<br>veya BLG 231E MIN DD,-
30535,BLG 221E,Data Structures,-,Bora Döken,EEB<br>EEB,Salı<br>Çarşamba,09:30/12:29<br>09:30/12:29,-,35,10,-,"EHB, EHBE",BIL 105E MIN DD<br>veya BIL 104E MIN DD<br>veya BIL 106E MIN DD<br>veya BIL 108E MIN DD,-`;

try {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
    }) as any[];

    console.log("Successfully parsed " + records.length + " records.");
    console.log("First record snippet:");
    console.log("CRN:", records[0]['CRN']);
    console.log("Code:", records[0]['Course Code']);
    console.log("Building:", records[0]['Building']); // Should contain <br> or be quoted properly
    console.log("Day:", records[0]['Day']);

    const cleanList = (s: string) => s ? s.replace(/<br\s*\/?>/gi, ',').replace(/\s+/g, '').trim() : '';

    console.log("Cleaned Building:", cleanList(records[0]['Building']));
    console.log("Cleaned Day:", cleanList(records[0]['Day']));

} catch (err) {
    console.error("Parsing failed:", err);
}
