export async function dismissWelcome(page){
 await page.waitForFunction(()=>document.documentElement.dataset.workbench==='ready');
 const dismiss=page.locator('#wbDismissStart');
 if(await dismiss.isVisible())await dismiss.click();
}

/** Navigate through the same visible workbench controls as a user. */
export async function reveal(page,id){
 await dismissWelcome(page);
 const target=page.locator('#'+id);
 await target.waitFor({state:'attached'});
 const location=await target.evaluate(node=>({
  panel:node.closest('#wbCatalogPanel')?'catalog':node.closest('#wbAutomatePanel')?'automate':node.closest('#wbProjectPanel')?'project':null,
  inspector:node.closest('#wbOverview')?'overview':node.closest('#wbSelection')?'selection':null,
  side:node.closest('aside')?.id||null,
  hiddenInput:node instanceof HTMLInputElement&&node.type==='file',
 }));
 if((location.panel||location.inspector)&&await page.locator('body').evaluate(node=>!node.classList.contains('edit'))){
  await page.locator('[data-mode="edit"]').click();
 }
 if(location.side){
  if(await page.locator('body').evaluate(node=>node.classList.contains('immersive')))await page.locator('#focusBtn').click();
  const other=location.side==='left'?'right':'left',closeOther=page.locator(`[data-close="${other}"]`);
  if(await closeOther.isVisible())await closeOther.click();
  if(!await page.locator('#'+location.side).isVisible())await page.locator('#'+location.side+'Toggle').click();
 }
 if(location.panel){
  const tab=page.locator(`[data-panel="${location.panel}"]`);
  if(await tab.getAttribute('aria-selected')!=='true')await tab.click();
 }
 if(location.inspector){
  const tab=page.locator(`[data-inspector="${location.inspector}"]`);
  if(await tab.getAttribute('aria-selected')!=='true')await tab.click();
 }
 const details=target.locator('xpath=ancestor::details');
 for(let i=(await details.count())-1;i>=0;i--){
  const parent=details.nth(i);
  if(await parent.getAttribute('open')===null)await parent.locator(':scope > summary').click();
 }
 if(!location.hiddenInput)await target.waitFor({state:'visible'});
 return target;
}
