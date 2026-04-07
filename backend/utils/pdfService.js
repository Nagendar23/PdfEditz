//open an existing PDF
//write the text 
//save the new PDF

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from 'fs';

export const processPDF = async({
    inputPath,
    outputPath,
    elements,
})=>{
    const existingPDFBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPDFBytes);
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);   
    const pages = pdfDoc.getPages();

    for(const el of elements){
        const pageIndex = el.page ?? 0;
        if(pageIndex < 0 || pageIndex >= pages.length){
            throw new Error(`Invalid page index : ${pageIndex}`)
        }

        const page = pages[pageIndex];
        const {width, height} = page.getSize();

        let x = el.position.x;
        let y = height - el.position.y;

        // ✅ TEXT HANDLING - INSIDE LOOP WITH TYPE CHECK
        if(el.type === "text"){
            const fontSize = el.style?.fontSize || 20;
            const textWidth = font.widthOfTextAtSize(el.text, fontSize);
            const align = el.style?.align || "left";
            
            if(align === "center"){
                x = x - textWidth / 2
            }else if(align === "right"){
                x = x - textWidth
            }
            
            let color = rgb(0,0,0);
            if(el.style?.color){
                const hex = el.style.color.replace("#","");
                const r = parseInt(hex.substring(0,2),16)/255;
                const g = parseInt(hex.substring(2,4),16)/255;
                const b = parseInt(hex.substring(4,6),16)/255;
                color = rgb(r,g,b)
            }
            
            page.drawText(el.text,{
                x,
                y,
                size: fontSize,
                font,
                color
            })
        }

        // ✅ IMAGE HANDLING - INSIDE LOOP WITH TYPE CHECK
        if(el.type === "image"){
            if(!el.imagePath){
                throw new Error("Missing imagePath");
            }
            const imageBytes = fs.readFileSync(el.imagePath)
            let image;
            if(el.imagePath.endsWith(".png")){
                image = await pdfDoc.embedPng(imageBytes)
            }else{
                image = await pdfDoc.embedJpg(imageBytes)
            }

            const imgWidth = el.size?.width || 100;
            const imgHeight = el.size?.height || 100;
            
            page.drawImage(image,{
                x,
                y,
                width: imgWidth,
                height: imgHeight,
            })
        }
    }

    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(outputPath, pdfBytes);
}