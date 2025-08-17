/**
 * 适配器模块统一导出
 */

export * from './siteAdapter';
export { DeepSeekAdapter } from './deepseekAdapter';
export { KimiAdapter } from './kimiAdapter';
export { DoubaoAdapter } from './doubaoAdapter';

// 自动注册所有适配器
import { AdapterFactory } from './siteAdapter';
import { DeepSeekAdapter } from './deepseekAdapter';
import { KimiAdapter } from './kimiAdapter';
import { DoubaoAdapter } from './doubaoAdapter';

// 注册所有适配器
AdapterFactory.register(new DeepSeekAdapter());
AdapterFactory.register(new KimiAdapter());
AdapterFactory.register(new DoubaoAdapter());

console.log('站点适配器已注册:', AdapterFactory.getAllAdapters().map(a => a.getPlatformName()));
