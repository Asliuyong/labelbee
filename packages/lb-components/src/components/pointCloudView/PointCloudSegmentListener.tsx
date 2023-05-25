import React, { useContext, useEffect } from 'react';
import { a2MapStateToProps, IA2MapStateProps } from '@/store/annotation/map';
import { connect } from 'react-redux';
import { LabelBeeContext } from '@/store/ctx';
import { ICustomToolInstance } from '@/hooks/annotation';
import { PointCloudContext } from './PointCloudContext';
import { CommonToolUtils } from '@labelbee/lb-annotation';
import {
  EPointCloudSegmentMode,
  PointCloudUtils,
  IPointCloudSegmentation,
} from '@labelbee/lb-utils';
import { useAttribute } from './hooks/useAttribute';
import { IInputList } from '@/types/main';

interface IProps extends IA2MapStateProps {
  checkMode?: boolean;
  toolInstanceRef: React.MutableRefObject<ICustomToolInstance>;
}

const PointCloudSegmentListener: React.FC<IProps> = ({ checkMode, currentData, imgIndex, highlightAttribute, config, toolInstanceRef }) => {
  const { updateSegmentAttribute } = useAttribute();

  const ptCtx = useContext(PointCloudContext);
  const { ptSegmentInstance, setSegmentation } = ptCtx;

  /**
   * Listen
   */
  useEffect(() => {
    if (ptSegmentInstance && currentData.url) {
      // Parse Data.
      ptSegmentInstance.loadPCDFile(currentData?.url ?? '').then(() => {
        ptSegmentInstance.emit('clearAllSegmentData');
        const segmentData = PointCloudUtils.getSegmentFromResultList(currentData?.result ?? '');

        ptSegmentInstance?.store?.updateCurrentSegment(segmentData);
      });
      // Update segmentData.
      ptSegmentInstance.on('syncSegmentData', (segmentation: IPointCloudSegmentation[]) => {
        setSegmentation(segmentation)
      })
    }
  }, [imgIndex, ptSegmentInstance]);

  useEffect(() => {
    let attributeValue = config.attributeList.find((v: IInputList) => v?.key === highlightAttribute)?.value
    ptSegmentInstance?.store?.highlightPointsByAttribute(attributeValue ?? '')
  }, [highlightAttribute, ptSegmentInstance])

  const segmentKeydownEvents = (lowerCaseKey: string, e: KeyboardEvent) => {
    switch (lowerCaseKey) {
      case 'h':
        ptSegmentInstance?.emit('LassoSelector');
        break;

      case 'j':
        ptSegmentInstance?.emit('CircleSelector');
        break;

      case 'u':
        ptSegmentInstance?.emit('setSegmentMode', EPointCloudSegmentMode.Add);
        break;

      case 'i':
        ptSegmentInstance?.emit('setSegmentMode', EPointCloudSegmentMode.Remove);
        break;
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!CommonToolUtils.hotkeyFilter(e) || checkMode === true) {
      return;
    }
    const lowerCaseKey = e.key.toLocaleLowerCase();

    segmentKeydownEvents(lowerCaseKey, e);
  };

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);

    toolInstanceRef.current.setDefaultAttribute = (newAttribute: string) => {
      updateSegmentAttribute(newAttribute);
    };

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [ptSegmentInstance]);

  useEffect(() => {
    toolInstanceRef.current.exportData = () => {
      return [ptCtx.pointCloudBoxList, { valid: ptCtx.valid }];
    };

    toolInstanceRef.current.exportCustomData = () => {
      return {
        resultPolygon: ptCtx.polygonList ?? [],
        resultLine: ptCtx.lineList ?? [],
        resultPoint: ptCtx.pointCloudSphereList ?? [],
        segmentation: ptSegmentInstance?.store?.formatData,
      };
    };

    toolInstanceRef.current.clearResult = () => {
      if (!ptCtx.ptSegmentInstance) {
        return;
      }
      ptCtx.ptSegmentInstance.emit('clearSegmentResult');
    };
  }, [
    ptCtx.pointCloudBoxList,
    ptCtx.valid,
    ptCtx.polygonList,
    ptCtx.lineList,
    ptCtx.pointCloudSphereList,
    ptCtx.ptSegmentInstance,
  ]);

  return null;
};

export default connect(a2MapStateToProps, null, null, { context: LabelBeeContext })(
  PointCloudSegmentListener,
);
